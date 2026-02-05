import { prisma } from '../config/database.js';
import { Prisma } from '@prisma/client';

export async function getUserById(id: number) {
  return prisma.user.findUnique({ where: { id } });
}

export async function updateUserConfig(userId: number, config: {
  gradeLevel?: string;
  activeSubjects?: string[];
  focusCategories?: Record<string, string>;
  customPromptActive?: boolean;
  customPromptText?: string;
}) {
  const updateData: Prisma.UserUpdateInput = {};
  
  if (config.gradeLevel) {
    updateData.gradeLevel = config.gradeLevel as any;
  }
  if (config.activeSubjects) {
    updateData.activeSubjects = config.activeSubjects;
  }
  if (config.focusCategories !== undefined) {
    updateData.focusCategories = config.focusCategories;
  }
  if (config.customPromptActive !== undefined) {
    updateData.customPromptActive = config.customPromptActive;
  }
  if (config.customPromptText !== undefined) {
    updateData.customPromptText = config.customPromptText;
  }
  
  return prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
}
