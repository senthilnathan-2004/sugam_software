import React from 'react';

export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-background">
      <div className="relative flex items-center justify-center w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white text-lg">
          S
        </div>
      </div>
      <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">
        Loading Sugam HMS
      </h2>
      <p className="text-sm text-slate-500 font-medium">
        Initializing workspace...
      </p>
    </div>
  );
}
