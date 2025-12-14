import { PrismaService } from '@common/prisma';
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  SendGreetingEmailBody,
  SignInBody,
  SignUpBody,
} from './interfaces';
import { compareValue, hashValue } from './utils';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@common/constants';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mailService: MailService,
  ) {}

  async sendGreetingEmail({ email, userId }: SendGreetingEmailBody) {
    await this.mailService.sendMail(
      {
        to: email,
        subject: 'Welcome to UniPrep!',
        text: 'Thank you for registering.',
      },
      'welcome',
      {
        userEmail: email,
        userId: userId,
      },
    );
  }

  async signUp(body: SignUpBody) {
    const { email, password } = body;

    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists)
      throw new ForbiddenException(ERROR_MESSAGES.USER_ALREADY_EXISTS);

    const hashed = await hashValue(password);

    const user = await this.prisma.user.create({
      data: { email, password: hashed },
    });

    await this.sendGreetingEmail({ email: user.email, userId: user.id });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  async signIn(body: SignInBody) {
    const { email, password } = body;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

    const matches = await compareValue(password, user.password);
    if (!matches) throw new ForbiddenException(ERROR_MESSAGES.INVALID_PASSWORD);

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refresh_token: null },
    });

    return { message: SUCCESS_MESSAGES.LOGOUT_SUCCESS };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);

    return user;
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refresh_token)
      throw new ForbiddenException(ERROR_MESSAGES.ACCESS_DENIED);

    const matches = await compareValue(refreshToken, user.refresh_token);
    if (!matches) throw new ForbiddenException(ERROR_MESSAGES.ACCESS_DENIED);

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashed = await hashValue(refreshToken);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refresh_token: hashed },
    });
  }

  async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const access_token = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN as any,
    });

    const refresh_token = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as any,
    });

    return {
      access_token,
      refresh_token,
    };
  }
}
