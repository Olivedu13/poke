import { prisma } from '../config/database.js';
import { Prisma } from '@prisma/client';

export async function getUserById(id: number) {
  return prisma.user.findUnique({ where: { id } });
}

// Map frontend grade values to Prisma enum names
const GRADE_TO_PRISMA: Record<string, string> = {
  'CP': 'CP', 'CE1': 'CE1', 'CE2': 'CE2', 'CM1': 'CM1', 'CM2': 'CM2',
  '6EME': 'SIXIEME', '5EME': 'CINQUIEME', '4EME': 'QUATRIEME', '3EME': 'TROISIEME',
};

export async function updateUserConfig(userId: number, config: {
  gradeLevel?: string;
  activeSubjects?: string[];
  focusCategories?: Record<string, string>;
  customPromptActive?: boolean;
  customPromptText?: string;
}) {
  const updateData: Prisma.UserUpdateInput = {};
  
  if (config.gradeLevel) {
    const prismaGrade = GRADE_TO_PRISMA[config.gradeLevel] || config.gradeLevel;
    updateData.gradeLevel = prismaGrade as any;
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
