jest.mock('nodemailer-express-handlebars', () => {
  return () => {
    return function (_mail, callback) {
      if (callback) callback();
    };
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { mock, MockProxy } from 'jest-mock-extended';
import { SUCCESS_MESSAGES } from '@common/constants';
import {
  mockRequestBody,
  mockRequestBodyWithToken,
  mockSignInBody,
  mockSignUpBody,
  mockTokens,
  mockUser,
} from './mocks';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: MockProxy<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mock<AuthService>(),
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    authService = module.get(AuthService);
  });

  describe('signUp', () => {
    it('should call authService.signUp and return result', async () => {
      const body = mockSignUpBody;
      const expectedResult = mockTokens;

      authService.signUp.mockResolvedValue(expectedResult);

      const result = await controller.signUp(body);

      expect(result).toEqual(expectedResult);
      expect(authService.signUp).toHaveBeenCalledWith(body);
    });
  });

  describe('signIn', () => {
    it('should call authService.signIn and return result', async () => {
      const body = mockSignInBody;
      const expectedResult = mockTokens;

      authService.signIn.mockResolvedValue(expectedResult);

      const result = await controller.signIn(body);

      expect(result).toEqual(expectedResult);
      expect(authService.signIn).toHaveBeenCalledWith(body);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with userId', async () => {
      const req = mockRequestBody;

      authService.logout.mockResolvedValue({
        message: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
      });

      await controller.logout(req);

      expect(authService.logout).toHaveBeenCalledWith(mockRequestBody.user.sub);
    });
  });

  describe('getMe', () => {
    it('should call authService.getMe with userId', async () => {
      const req = mockRequestBody;

      authService.getMe.mockResolvedValue(mockUser);

      const result = await controller.getMe(req);

      expect(result).toEqual(mockUser);
      expect(authService.getMe).toHaveBeenCalledWith(mockRequestBody.user.sub);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshTokens with userId and refreshToken', async () => {
      const req = mockRequestBodyWithToken;
      const expectedResult = mockTokens;

      authService.refreshTokens.mockResolvedValue(expectedResult);

      const result = await controller.refresh(req);

      expect(result).toEqual(expectedResult);
      expect(authService.refreshTokens).toHaveBeenCalledWith(
        mockRequestBodyWithToken.user.sub,
        mockRequestBodyWithToken.user.refreshToken,
      );
    });
  });
});
