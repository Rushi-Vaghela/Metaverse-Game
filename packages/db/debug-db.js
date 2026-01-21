const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL || "postgresql://postgres:password@127.0.0.1:5433/metaverse?schema=public"
        }
    }
});

async function main() {
    console.log('Testing Prisma Connection...');
    console.log('URL:', process.env.DATABASE_URL || "Using fallback URL");
    try {
        await prisma.$connect();
        console.log('Successfully connected to database!');
        // Try a simple query
        const count = await prisma.user.count();
        console.log('User count:', count);
    } catch (e) {
        console.error('Connection failed with error:');
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
