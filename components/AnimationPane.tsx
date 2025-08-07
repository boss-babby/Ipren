import React, { useState, useEffect, useRef } from 'react';
import { SlideElement, Animation, AnimationType, AnimationTrigger, AnimationEffect } from '../types';
import { CloseIcon, DragHandleIcon, MouseClickIcon, WithPreviousIcon, AfterPreviousIcon, TrashIcon, PlayIcon } from './icons';

interface AnimationPaneProps {
    elements: SlideElement[];
    onClose: () => void;
    onUpdateAnimation: (elementId: string, animation: Animation) => void;
    onRemoveAnimation: (elementId: string) => void;
    onReorder: (movedId: string, targetId: string | null) => void;
}

const getAnimationIcon = (type: AnimationType) => {
    switch (type) {
        case AnimationType.ENTRANCE: return <span className="text-green-500 font-bold">E</span>;
        case AnimationType.EMPHASIS: return <span className="text-yellow-500 font-bold">M</span>;
        case AnimationType.EXIT: return <span className="text-red-500 font-bold">X</span>;
        default: return null;
    }
};

const getTriggerIcon = (trigger: AnimationTrigger) => {
    switch (trigger) {
        case AnimationTrigger.ON_CLICK: return <MouseClickIcon />;
        case AnimationTrigger.WITH_PREVIOUS: return <WithPreviousIcon />;
        case AnimationTrigger.AFTER_PREVIOUS: return <AfterPreviousIcon />;
        default: return null;
    }
};

const AnimationPane: React.FC<AnimationPaneProps> = ({ elements, onClose, onUpdateAnimation, onRemoveAnimation, onReorder }) => {
    const [position, setPosition] = useState({ x: window.innerWidth - 380, y: 140 });
    const panelRef = useRef<HTMLDivElement>(null);
    const draggedItemIdRef = useRef<string | null>(null);

    const animatedElements = elements.filter(el => el.animation);

    const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const startX = e.clientX - position.x;
        const startY = e.clientY - position.y;
        const handleMouseMove = (moveEvent: MouseEvent) => {
            setPosition({ x: moveEvent.clientX - startX, y: moveEvent.clientY - startY });
        };
        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const onDragStart = (e: React.DragEvent<HTMLLIElement>, id: string) => {
        draggedItemIdRef.current = id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id); // Necessary for Firefox
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };
    
    const onDrop = (e: React.DragEvent<HTMLLIElement>, targetId: string) => {
        e.preventDefault();
        const movedId = draggedItemIdRef.current;
        if (movedId && movedId !== targetId) {
            onReorder(movedId, targetId);
        }
        draggedItemIdRef.current = null;
    };

    const onDropAtEnd = (e: React.DragEvent) => {
        e.preventDefault();
        const movedId = draggedItemIdRef.current;
        if (movedId) {
            onReorder(movedId, null); // null target means move to end
        }
        draggedItemIdRef.current = null;
    }


    return (
        <div
            ref={panelRef}
            className="fixed w-96 h-[500px] bg-gray-50 rounded-lg shadow-2xl border border-gray-300 flex flex-col"
            style={{ top: position.y, left: position.x, zIndex: 1001 }}
        >
            <div
                onMouseDown={handleDragStart}
                className="flex items-center justify-between p-2 bg-slate-700 text-white rounded-t-lg cursor-move"
            >
                <h3 className="font-semibold text-sm">Animation Pane</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-600">
                    <CloseIcon />
                </button>
            </div>
            
            <ul className="flex-1 overflow-y-auto p-2 space-y-1">
                {animatedElements.map((el) => {
                    if (!el.animation) return null;
                    return (
                        <li 
                            key={el.id} 
                            className="bg-white border border-gray-200 rounded p-2 hover:bg-gray-100 group"
                            draggable
                            onDragStart={(e) => onDragStart(e, el.id)}
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, el.id)}
                        >
                            <div className="flex items-center space-x-2">
                                <span className="cursor-move text-gray-400"><DragHandleIcon /></span>
                                <div className="w-5 text-center">{getAnimationIcon(el.animation.type)}</div>
                                <div className="flex-1 text-xs truncate">
                                    {(el.type === 'CONTENT' || el.type === 'TITLE' || el.type === 'SUBTITLE') ? (el as any).content.replace(/<[^>]+>/g, '') : el.type}
                                </div>
                                <button onClick={() => onRemoveAnimation(el.id)} className="text-red-500 opacity-0 group-hover:opacity-100" title="Remove Animation">
                                    <TrashIcon />
                                </button>
                            </div>
                            <div className="mt-2 pl-6 flex items-center space-x-2 text-xs text-gray-600">
                                <div className="flex items-center space-x-1 p-1 rounded bg-gray-100">
                                    <label title="Trigger" className="cursor-pointer">{getTriggerIcon(el.animation.trigger)}</label>
                                    <select
                                        value={el.animation.trigger}
                                        onChange={e => onUpdateAnimation(el.id, { ...el.animation!, trigger: e.target.value as AnimationTrigger })}
                                        className="bg-transparent border-none text-xs focus:outline-none"
                                    >
                                        <option value={AnimationTrigger.ON_CLICK}>On Click</option>
                                        <option value={AnimationTrigger.WITH_PREVIOUS}>With Previous</option>
                                        <option value={AnimationTrigger.AFTER_PREVIOUS}>After Previous</option>
                                    </select>
                                </div>
                                <div className="flex items-center space-x-1 p-1 rounded bg-gray-100">
                                    <label className="font-medium">Dur:</label>
                                    <input
                                        type="number"
                                        value={el.animation.duration}
                                        onChange={e => onUpdateAnimation(el.id, { ...el.animation!, duration: parseInt(e.target.value) || 0 })}
                                        className="w-14 bg-transparent border-none text-xs focus:outline-none"
                                        step="100"
                                    />
                                </div>
                                <div className="flex items-center space-x-1 p-1 rounded bg-gray-100">
                                    <label className="font-medium">Delay:</label>
                                    <input
                                        type="number"
                                        value={el.animation.delay}
                                        onChange={e => onUpdateAnimation(el.id, { ...el.animation!, delay: parseInt(e.target.value) || 0 })}
                                        className="w-14 bg-transparent border-none text-xs focus:outline-none"
                                        step="100"
                                    />
                                </div>
                            </div>
                        </li>
                    );
                })}
                 <div onDragOver={onDragOver} onDrop={onDropAtEnd} className="h-4"></div>
            </ul>
        </div>
    );
};

export default AnimationPane;
