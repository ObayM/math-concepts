import {
  FunctionSquare,
  TrendingUp,
  Sigma,
  LineChart,
  Move,
} from 'lucide-react';

export const lessonsData = [
  {
    id: 'real-functions-1',
    title: 'Intro to Real Functions',
    description:
      'Understand how to determine the domain and range of real functions, including restrictions and interval representation.',
    category: 'Algebra',
    difficulty: 'Beginner',
    status: 'completed',
    icon: (props) => <FunctionSquare {...props} />,
  },
  {
    id: 'real-functions-2',
    title: 'Monotonicity of Functions',
    description:
      'Learn how to analyze whether a function is increasing, decreasing, or non-monotonic.',
    category: 'Algebra',
    difficulty: 'Beginner',
    status: 'unlocked',
    icon: (props) => <TrendingUp {...props} />,
  },
  {
    id: 'real-functions-3',
    title: 'Operations on Functions',
    description:
      'Explore how to add, subtract, multiply, divide, and compose functions.',
    category: 'Algebra',
    difficulty: 'Intermediate',
    status: 'locked',
    icon: (props) => <Sigma {...props} />,
  },
  {
    id: 'real-functions-4',
    title: 'Properties of Functions',
    description:
      'Study even, odd, and one-to-one functions and how to identify them graphically and algebraically.',
    category: 'Algebra',
    difficulty: 'Intermediate',
    status: 'locked',
    icon: (props) => <LineChart {...props} />,
  },
  {
    id: 'real-functions-5',
    title: 'Graphing Basic and Piecewise Functions',
    description:
      'Learn how to sketch basic function graphs and piecewise-defined functions.',
    category: 'Algebra',
    difficulty: 'Intermediate',
    status: 'locked',
    icon: (props) => <LineChart {...props} />,
  },
  {
    id: 'real-functions-6',
    title: 'Geometric Transformations of Functions',
    description:
      'Understand shifts, reflections, stretching, and compression of function graphs.',
    category: 'Algebra',
    difficulty: 'Intermediate',
    status: 'locked',
    icon: (props) => <Move {...props} />,
  },
];