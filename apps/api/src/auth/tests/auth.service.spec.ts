jest.mock('nodemailer-express-handlebars', () => {
  return () => {
    return function (_mail, callback) {
      if (callback) callback();
    };
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { PrismaService } from '@common/prisma';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mockSignUpBody, mockSignInBody, mockTokens, mockUser } from './mocks';
import * as utils from '../utils';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@common/constants';
import { MailService } from '../../mail/mail.service';

jest.mock('../utils', () => ({
  hashValue: jest.fn(async (val: string) => `hashed-${val}`),
  compareValue: jest.fn(
    async (val: string, hash: string) => hash === `hashed-${val}`,
  ),
}));

const mockMailService = {
  sendMail: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: { user: {} } },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get(AuthService);
    prisma = module.get(PrismaService);
    jwt = module.get(JwtService);

    prisma.user.findUnique = jest.fn();
    prisma.user.create = jest.fn();
    prisma.user.update = jest.fn();

    (jwt.signAsync as jest.Mock)
      .mockResolvedValueOnce('token')
      .mockResolvedValueOnce('refresh');
  });

  describe('signUp', () => {
    it('should create a user, return tokens and send welcome email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

      jest.spyOn(service, 'generateTokens').mockResolvedValue(mockTokens);
      jest.spyOn(service, 'updateRefreshToken').mockResolvedValue(undefined);

      const result = await service.signUp(mockSignUpBody);

      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: mockSignUpBody.email }),
        'welcome',
        expect.objectContaining({ userId: mockUser.id }),
      );
      expect(result).toEqual(mockTokens);
    });

    it('should throw if user already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.signUp(mockSignUpBody)).rejects.toThrow(
        new ForbiddenException(ERROR_MESSAGES.USER_ALREADY_EXISTS),
      );
    });
  });

  describe('signIn', () => {
    it('should return tokens if credentials are correct', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (utils.compareValue as jest.Mock).mockResolvedValue(true);

      jest.spyOn(service, 'generateTokens').mockResolvedValue(mockTokens);
      jest.spyOn(service, 'updateRefreshToken').mockResolvedValue(undefined);

      const result = await service.signIn(mockSignInBody);

      expect(result).toEqual(mockTokens);
    });

    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.signIn(mockSignInBody)).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND),
      );
    });

    it('should throw if password is invalid', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (utils.compareValue as jest.Mock).mockResolvedValue(false);

      await expect(service.signIn(mockSignInBody)).rejects.toThrow(
        new ForbiddenException(ERROR_MESSAGES.INVALID_PASSWORD),
      );
    });
  });

  describe('logout', () => {
    it('should clear the refresh token', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.logout(mockUser.id);

      expect(result).toEqual({ message: SUCCESS_MESSAGES.LOGOUT_SUCCESS });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { refresh_token: null },
      });
    });
  });

  describe('getMe', () => {
    it('should return the user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getMe(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('should throw if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getMe(mockUser.id)).rejects.toThrow(
        new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND),
      );
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens if refresh token matches', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        refresh_token: 'hashed-refresh-token',
      });

      (utils.compareValue as jest.Mock).mockResolvedValue(true);

      jest.spyOn(service, 'generateTokens').mockResolvedValue(mockTokens);
      jest.spyOn(service, 'updateRefreshToken').mockResolvedValue(undefined);

      const result = await service.refreshTokens(mockUser.id, 'refresh-token');

      expect(result).toEqual(mockTokens);
    });

    it('should throw if user not found or no refresh token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.refreshTokens(mockUser.id, 'refresh-token'),
      ).rejects.toThrow(new ForbiddenException(ERROR_MESSAGES.ACCESS_DENIED));

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        refresh_token: null,
      });

      await expect(
        service.refreshTokens(mockUser.id, 'refresh-token'),
      ).rejects.toThrow(new ForbiddenException(ERROR_MESSAGES.ACCESS_DENIED));
    });

    it('should throw if refresh token does not match', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        refresh_token: 'hashed-other',
      });

      (utils.compareValue as jest.Mock).mockResolvedValue(false);

      await expect(
        service.refreshTokens(mockUser.id, 'refresh-token'),
      ).rejects.toThrow(new ForbiddenException(ERROR_MESSAGES.ACCESS_DENIED));
    });
  });
});
