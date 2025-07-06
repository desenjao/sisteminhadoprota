-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "peso_atual" DOUBLE PRECISION,
    "peso_meta" DOUBLE PRECISION,
    "xp_total" INTEGER NOT NULL DEFAULT 0,
    "rank" VARCHAR(50) NOT NULL DEFAULT 'Iniciante',
    "dia_atual" INTEGER NOT NULL DEFAULT 1,
    "data_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Missao" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "dia" INTEGER NOT NULL,
    "horario" VARCHAR(5) NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "categoria" VARCHAR(20) NOT NULL,
    "dificuldade" VARCHAR(20) NOT NULL,
    "descricao" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Missao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Missao" ADD CONSTRAINT "Missao_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
