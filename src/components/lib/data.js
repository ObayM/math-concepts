import {
  FunctionSquare,
  TrendingUp,
  Sigma,
  LineChart,
  Move,
  Undo2,
  MapPin,
  Triangle,
  Circle,
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
  {
    id: 'real-functions-7',
    title: 'Inverse Functions',
    description:
      'Learn how to determine whether a function is invertible, find the inverse algebraically, and interpret inverse functions graphically.',
    category: 'Algebra',
    difficulty: 'Intermediate',
    status: 'locked',
    icon: (props) => <Undo2 {...props} />,
  },
];

export const geometryLessonsData = [
  {
    id: 'basic-geometry-1',
    title: 'Points & Coordinates',
    description:
      'Master the Cartesian plane. Learn how to plot points and calculate the distance between them using the Distance Formula.',
    category: 'Geometry',
    difficulty: 'Beginner',
    status: 'unlocked',
    icon: (props) => <MapPin {...props} />,
  },
  {
    id: 'basic-geometry-2',
    title: 'The Slope of a Line',
    description:
      'Understand the concept of slope as "Rise over Run" and how it defines the steepness and direction of a line.',
    category: 'Geometry',
    difficulty: 'Beginner',
    status: 'locked',
    icon: (props) => <TrendingUp {...props} />,
  },
  {
    id: 'basic-geometry-3',
    title: 'Triangles on the Plane',
    description:
      'Explore the properties of triangles in the coordinate plane, including vertices, side lengths, and area calculations.',
    category: 'Geometry',
    difficulty: 'Intermediate',
    status: 'locked',
    icon: (props) => <Triangle {...props} />,
  },
  {
    id: 'basic-geometry-4',
    title: 'The Circle Equation',
    description:
      'Derive and understand the standard equation of a circle (x-h)² + (y-k)² = r² and how to graph it.',
    category: 'Geometry',
    difficulty: 'Intermediate',
    status: 'locked',
    icon: (props) => <Circle {...props} />,
  },
];