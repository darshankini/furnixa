import 'temporal-polyfill/full/global';
import type {} from 'temporal-polyfill/types/global'; // lets TypeScript know about the global Temporal type
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.js';
import contractJson from './contract.json' with { type : 'json' }

function createDb(url: string){
    return postgres<Contract>({ contractJson, url})
}

export type Db = ReturnType<typeof createDb>;

@Injectable()
export class PrismaService implements OnModuleDestroy{
    readonly db:Db;

    constructor(config:ConfigService){
        this.db = createDb(config.getOrThrow<string>('DATABASE_URL'));
    }

    get orm(): Db['orm']{
        return this.db.orm;
    }

    async onModuleDestroy() {
        await this.db.close();
    }

}