import React from 'react';

// Simplified Theme component
const Theme = () => {
  return (
    <div className="flex items-center gap-2 p-2">
      {/* Sun icon removed as requested */}
    </div>
  );
};

const ThemeSelector = ({ returnThemeOnly }: { returnThemeOnly?: boolean }) => {
  if (returnThemeOnly === true) {
    return <Theme />;
  }

  return (
    <div className="flex flex-col items-center justify-center bg-white pt-6 sm:pt-0">
      <div className="absolute bottom-0 left-0 m-4">
        <Theme />
      </div>
    </div>
  );
};

export default ThemeSelector;
