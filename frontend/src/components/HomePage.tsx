import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: '🎨',
      title: 'UI/UX Designer',
      description: 'Visual design, layouts, and user experience analysis',
      color: 'from-pink-500 to-rose-500',
      accent: 'pink'
    },
    {
      icon: '💻',
      title: 'Developer',
      description: 'Technical feasibility and implementation guidance',
      color: 'from-green-500 to-emerald-500',
      accent: 'green'
    },
    {
      icon: '📊',
      title: 'Product Manager',
      description: 'Business strategy and feature prioritization',
      color: 'from-blue-500 to-indigo-500',
      accent: 'blue'
    },
    {
      icon: '🏆',
      title: 'Competitive Analysis',
      description: 'Market positioning and competitive intelligence',
      color: 'from-orange-500 to-red-500',
      accent: 'orange'
    },
    {
      icon: '🔍',
      title: 'Critical Review',
      description: 'Challenge assumptions with hard questions',
      color: 'from-purple-500 to-pink-500',
      accent: 'purple'
    },
    {
      icon: '🌟',
      title: 'Creative Coach',
      description: 'Alternative ideas and enhancement suggestions',
      color: 'from-teal-500 to-cyan-500',
      accent: 'teal'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-cyan-900/20"></div>
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="text-center">
          {/* Main heading with glow effect */}
          <div className="mb-8">
            <h1 className="text-7xl md:text-9xl font-black mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-2xl">
                NEURAL
              </span>
            </h1>
            <h2 className="text-4xl md:text-6xl font-light text-gray-300 tracking-widest">
              MULTI-AGENT SYSTEM
            </h2>
          </div>
          
          <p className="text-xl md:text-2xl text-gray-400 mb-16 max-w-4xl mx-auto leading-relaxed font-light">
            Deploy specialized AI agents to analyze, critique, and enhance your ideas from multiple perspectives. 
            <span className="text-cyan-400">Neural intelligence</span> meets collaborative analysis.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button
              onClick={() => navigate('/workspace')}
              className="group relative px-12 py-5 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-2xl font-bold text-lg shadow-2xl hover:shadow-cyan-500/25 transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10 flex items-center">
                INITIATE ANALYSIS
                <svg className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
            
            <button
              onClick={() => navigate('/templates')}
              className="px-12 py-5 border-2 border-gray-700 text-gray-300 rounded-2xl font-bold text-lg hover:border-cyan-500 hover:text-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 backdrop-blur-sm"
            >
              AGENT LAB
            </button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            AGENT SPECIALISTS
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mb-6"></div>
          <p className="text-xl text-gray-400 font-light">Each agent brings unique expertise to your analysis</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-3xl p-8 hover:border-cyan-500/50 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/10"
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-cyan-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                  {feature.description}
                </p>
              </div>

              {/* Corner accent */}
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${feature.color} opacity-10 rounded-bl-3xl rounded-tr-3xl group-hover:opacity-20 transition-opacity duration-300`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-purple-900/30 to-cyan-900/30 backdrop-blur-xl"></div>
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-5xl font-bold text-white mb-8">
            READY TO <span className="text-cyan-400">DEPLOY?</span>
          </h2>
          <p className="text-xl text-gray-300 mb-12 font-light">
            Transform your concepts with multi-dimensional AI analysis
          </p>
          <button
            onClick={() => navigate('/workspace')}
            className="px-16 py-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-black rounded-2xl font-black text-xl shadow-2xl hover:shadow-cyan-500/50 transform hover:scale-105 transition-all duration-300 tracking-wider"
          >
            ENTER WORKSPACE
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative z-10 py-24 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { value: '10', label: 'AI AGENTS', color: 'from-blue-400 to-cyan-400' },
              { value: '∞', label: 'CUSTOM BUILDS', color: 'from-purple-400 to-pink-400' },
              { value: '5X', label: 'FASTER ANALYSIS', color: 'from-green-400 to-emerald-400' },
              { value: '100%', label: 'REAL-TIME', color: 'from-orange-400 to-red-400' }
            ].map((stat, index) => (
              <div key={index} className="text-center group">
                <div className={`text-6xl font-black mb-3 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300`}>
                  {stat.value}
                </div>
                <div className="text-gray-400 font-light tracking-wider text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;