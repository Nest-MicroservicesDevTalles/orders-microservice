import { Injectable, OnModuleInit, Logger, HttpStatus, Inject } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';

import { PrismaClient } from '@prisma/client';

import { ChangeOrderStatusDto, CreateOrderDto, OrderPaginationDto } from './dto';
import { NATS_SERVICE } from 'src/configs';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrdersService');

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  public async create(createOrderDto: CreateOrderDto) {

    try {

      const productIds = createOrderDto.items.map((item) => item.productId);
      const products: any[] = await firstValueFrom(this.client.send({ cmd: 'validate_product' }, productIds));

      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {

        const price = products.find(product => product.id === orderItem.productId).price;

        return price * orderItem.quantity;

      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {

        return acc + orderItem.quantity;

      }, 0);

      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find(product => product.id === orderItem.productId).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity
              }))
            }
          }
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true
            }
          }
        }
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find(product => product.id === orderItem.productId).name
        }))
      };

    } catch (error) {

      throw new RpcException({
        message: 'check logs',
        status: HttpStatus.BAD_REQUEST
      })

    }

  }

  public async findAll(orderPaginationDto: OrderPaginationDto) {

    const totalPages: number = await this.order.count({ where: { status: orderPaginationDto.status } });
    const { page, limit } = orderPaginationDto;
    const lastPage = Math.ceil(totalPages / limit);

    return {
      data: await this.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: {
          status: orderPaginationDto.status
        }
      }),
      meta: {
        total: totalPages,
        page: page,
        lastPage: lastPage
      }
    }

  }

  public async findOne(id: string) {

    const order = await this.order.findFirst({
      where: { id },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true
          }
        }
      }
    });

    if (!order) {

      throw new RpcException({
        message: `Product with id #${id} not found`,
        status: HttpStatus.BAD_REQUEST
      });

    }

    const productIds = order.OrderItem.map(orderItem => orderItem.productId);
    const products: any[] = await firstValueFrom(this.client.send({ cmd: 'validate_product' }, productIds));


    return {
      ...order,
      OrderItem: order.OrderItem.map(orderItem => ({
        ...orderItem,
        name: products.find(product => product.id === orderItem.productId).name
      }))
    };

  }

  public async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {

    const { id, status } = changeOrderStatusDto;
    const order = await this.findOne(id);

    if (order.status === status) {
      return order;
    }

    return this.order.update({
      where: { id },
      data: {
        status
      }
    })

  }

}
