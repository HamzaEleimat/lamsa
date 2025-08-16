export default function TestTailwindPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-6xl font-bold text-white mb-8 drop-shadow-lg">
          Tailwind CSS Test Page
        </h1>
        
        <div className="bg-white rounded-lg shadow-2xl p-8 mb-8">
          <h2 className="text-3xl font-semibold text-gray-800 mb-4">
            If you can see these styles, Tailwind is working! ✅
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-500 text-white p-4 rounded-lg text-center hover:bg-blue-600 transition-colors">
              Blue Box
            </div>
            <div className="bg-green-500 text-white p-4 rounded-lg text-center hover:bg-green-600 transition-colors">
              Green Box
            </div>
            <div className="bg-yellow-500 text-white p-4 rounded-lg text-center hover:bg-yellow-600 transition-colors">
              Yellow Box
            </div>
          </div>
          
          <div className="mt-8 space-y-4">
            <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200">
              Gradient Button (Hover Me!)
            </button>
            
            <div className="flex space-x-2">
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                Badge 1
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Badge 2
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Badge 3
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 text-white p-6 rounded-lg">
          <p className="text-lg">
            This page uses various Tailwind utilities:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2">
            <li>Background gradients</li>
            <li>Responsive grid layout</li>
            <li>Hover effects</li>
            <li>Shadows and rounded corners</li>
            <li>Spacing utilities</li>
            <li>Color utilities</li>
          </ul>
        </div>
      </div>
    </div>
  );
}