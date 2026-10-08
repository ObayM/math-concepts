import { prisma } from '@/lib/prisma';
import { compileLesson } from '@/engine/lang';

let seq = 0;
const uid = (prefix: string) => `${prefix}-${Date.now()}-${seq++}`;

export async function makeUser(overrides: Record<string, unknown> = {}) {
  const id = uid('user');
  return prisma.user.create({
    data: {
      id,
      name: 'Test Student',
      email: `${id}@test.local`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    },
  });
}

export async function makeCourse(overrides: Record<string, unknown> = {}) {
  const name = uid('Course');
  return prisma.course.create({
    data: { name, slug: name.toLowerCase(), status: 'published', ...overrides },
  });
}

// mirrors contentService.publishLesson: compiled source lands in both the draft
// and published columns, so read paths that only look at publishedData work.
export async function makePublishedLesson(source: string, overrides: Record<string, unknown> = {}) {
  const data = compileLesson(source);
  const course = 'courseId' in overrides ? overrides.courseId : (await makeCourse()).id;

  return prisma.lesson.create({
    data: {
      courseId: course as string | null,
      lessonKey: uid('lesson'),
      source,
      data: data as never,
      publishedSource: source,
      publishedData: data as never,
      title: data.title,
      unit: data.unit ?? null,
      difficulty: data.difficulty ?? null,
      iconName: data.icon ?? null,
      kind: data.kind ?? null,
      description: data.summary ?? null,
      status: 'published',
      publishedAt: new Date(),
      sortOrder: 1,
      ...overrides,
    },
  });
}

export const NUMERIC_LESSON = `lesson "Derivatives" {
  course: "calculus"
  slide "Power rule" {
    id: "power"
    numeric {
      ask "What is the derivative of $3x^2$ at $x = 2$?"
      skill: "power-rule"
      answer: 12
      ! "Bring the 2 down, then substitute."
    }
  }

  slide "Pick one" {
    id: "pick"
    quiz {
      ask "Which rule differentiates $x^5$?"
      * "The power rule"
      - "The product rule"
      skill: "power-rule"
    }
  }
}`;

export const bankLesson = (questions: number) => `lesson "Practice bank" {
  kind: "bank"
${Array.from(
  { length: questions },
  (_, i) => `  slide "Q${i + 1}" {
    id: "q${i + 1}"
    cat: "Round ${Math.floor(i / 10) + 1}"
    numeric {
      ask "What is ${i} + 1?"
      skill: "counting"
      answer: ${i + 1}
    }
  }`
).join('\n')}
}`;
