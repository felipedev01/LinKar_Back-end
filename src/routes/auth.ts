import { Router, Request, Response } from 'express';
import prisma from '../prismaClient';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();


const router = Router();

const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(['PASSENGER', 'DRIVER']).refine((val) => ['PASSENGER', 'DRIVER'].includes(val), {
    message: "Função inválida"
  })
});

// Rota de Teste de Conexão
router.get('/test-connection', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ message: 'Connection successful' });
  } catch (error) {
    res.status(500).json({ message: 'Connection failed' });
  }
});
// Rota de Cadastro
router.post('/register', async (req: Request, res: Response) => {
  
  try {

    const validatedData = registerSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    const newUser = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role,
      },
    });
    res.status(201).json(newUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Retorna os erros de validação de forma clara
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error creating user' });
  }
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

router.post('/login', async (req: Request, res: Response) => {
  
  try {

    const validatedData = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: validatedData.email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT secret is not defined' });
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {

    if (error instanceof z.ZodError) {
      // Retorna os erros de validação
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ message: 'Error logging in' });
  }
});


export default router;
