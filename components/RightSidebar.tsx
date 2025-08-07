import React from 'react';
import { Slide } from '../types';
import DesignerPanel from './DesignerPanel';
import { CloseIcon } from './icons';

export type RightPanelTab = 'design';

interface RightSidebarProps {
  activeTab: RightPanelTab;
  setActiveTab: (tab: RightPanelTab) => void;
  slide: Slide | null;
  onUpdateSlide: (props: Partial<Slide>) => void;
  onSetTheme: (themeId: string) => void;
  onClose: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  activeTab,
  setActiveTab,
  slide,
  onUpdateSlide,
  onSetTheme,
  onClose,
}) => {
  if (!slide) {
    return (
        <aside className="w-[320px] bg-gray-50 border-l border-gray-300 flex items-center justify-center p-4">
            <p className="text-sm text-gray-500">No slide selected.</p>
        </aside>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
        case 'design':
            return <DesignerPanel onSelectTheme={onSetTheme} />;
        default:
            return null;
    }
  }

  return (
    <aside className="w-[320px] bg-gray-50 border-l border-gray-300 flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-300 pr-2">
        <div className="flex">
            <button
              onClick={() => setActiveTab('design')}
              className={`p-2 px-4 text-sm font-medium text-center transition-colors ${
                activeTab === 'design' ? 'bg-white text-gray-800 border-b-2 border-slate-700 -mb-px' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Design
            </button>
        </div>
        <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800">
            <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {renderActiveTab()}
      </div>
    </aside>
  );
};

export default RightSidebar;