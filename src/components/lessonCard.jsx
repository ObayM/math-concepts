
const difficultyColors = {
  Beginner: 'bg-green-100 text-green-800',
  Intermediate: 'bg-yellow-100 text-yellow-800',
  Advanced: 'bg-red-100 text-red-800',
};

export default function LessonCard({ lesson }) {
  const { id, title, description, category, difficulty } = lesson;

  return (
    <a href={`/lessons/${id}`} className="block group">
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col p-6 border border-gray-200/80">
        
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm  text-blue-700">{category}</p>
          <span className={`px-2 py-1 text-xs font-bold rounded-full ${difficultyColors[difficulty] || 'bg-gray-100 text-gray-800'}`}>
            {difficulty}
          </span>
        </div>

        <div className="grow">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
        </div>
        
        <div className="mt-6">
           <span className=" text-blue-600 group-hover:text-blue-800 transition-colors">
            Start
           </span>
        </div>
      </div>
    </a>
  );
}