/**
 * AppController Unit Tests
 *
 * Tests the main application controller functionality:
 * - Root endpoint response (getHello method)
 * - Controller method behavior
 * - Service integration with AppService
 *
 * These are unit tests that verify the controller logic in isolation,
 * mocking dependencies to focus on the controller's specific responsibilities.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../../app.controller';
import { AppService } from '../../app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
