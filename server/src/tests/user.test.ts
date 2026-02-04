import request from 'supertest';
import { GradeLevelType } from '@prisma/client';
import { createApp } from '../api/app.js';
import * as userService from '../services/user.service.js';

const app = createApp();

describe('GET /api/user/me', () => {
  it('should return user profile', async () => {
    const spy = jest.spyOn(userService, 'getUserById').mockResolvedValue({
      id: 1,
      username: 'demo',
      passwordHash: 'hashed',
      gradeLevel: GradeLevelType.CE1,
      activeSubjects: ['MATHS'],
      customPromptActive: false,
      customPromptText: null,
      gold: 0,
      tokens: 0,
      globalXp: 0,
      quizElo: 1000,
      streak: 0,
      createdAt: new Date(),
      focusCategories: null,
      inventories: [],
      userPokemon: [],
    } as unknown as Awaited<ReturnType<typeof userService.getUserById>>);

    const res = await request(app).get('/api/user/me');

    expect(spy).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();

    spy.mockRestore();
  });
});
