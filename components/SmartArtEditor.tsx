import React, { useState, useLayoutEffect, useRef } from 'react';
import { SmartArtElement, SmartArtType, SmartArtNode } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { PlusCircleIcon, TrashIcon, AddChildIcon } from './icons';

interface SmartArtEditorProps {
    element: SmartArtElement;
    onUpdate?: (props: Partial<SmartArtElement>) => void; // Make optional for read-only mode
}

// #region Helper Functions for Immutable Tree Manipulation

const deleteNodeFromTree = (root: SmartArtNode, nodeId: string): SmartArtNode | null => {
    if (root.id === nodeId) return null;
    const newChildren = (root.children || []).map(child => deleteNodeFromTree(child, nodeId)).filter(child => child !== null) as SmartArtNode[];
    return { ...root, children: newChildren };
};

const addSiblingNode = (root: SmartArtNode, siblingId: string, newNode: SmartArtNode): SmartArtNode => {
    const children = root.children || [];
    const siblingIndex = children.findIndex(c => c.id === siblingId);
    
    if (siblingIndex > -1) {
        const newChildren = [...children];
        newChildren.splice(siblingIndex + 1, 0, newNode);
        return { ...root, children: newChildren };
    }

    return {
        ...root,
        children: children.map(child => addSiblingNode(child, siblingId, newNode))
    };
};

const addChildNode = (root: SmartArtNode, parentId: string, newNode: SmartArtNode): SmartArtNode => {
     if (root.id === parentId) {
        return { ...root, children: [...(root.children || []), newNode] };
    }
    const newChildren = (root.children || []).map(child => addChildNode(child, parentId, newNode));
    return { ...root, children: newChildren };
}

const updateNodeText = (root: SmartArtNode, nodeId: string, newText: string): SmartArtNode => {
    if (root.id === nodeId) {
        return { ...root, text: newText };
    }
    return {
        ...root,
        children: (root.children || []).map(child => updateNodeText(child, nodeId, newText)),
    };
};

// #endregion

const EditableNode: React.FC<{
    node: SmartArtNode;
    color: string;
    textColor?: string;
    isEditable: boolean;
    onTextChange: (text: string) => void;
    onAddSibling: () => void;
    onAddChild: () => void;
    onDelete: () => void;
    isRoot: boolean;
}> = ({ node, color, textColor, isEditable, onTextChange, onAddSibling, onAddChild, onDelete, isRoot }) => {
    const [isHovered, setIsHovered] = useState(false);

    const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        const newText = e.currentTarget.innerHTML || '';
        if (node.text !== newText) {
            onTextChange(newText);
        }
    };

    return (
        <div 
            className="relative"
            onMouseEnter={() => isEditable && setIsHovered(true)} 
            onMouseLeave={() => isEditable && setIsHovered(false)}
        >
            <div
                className="p-2 rounded shadow text-center text-sm flex items-center justify-center transition-all"
                style={{ backgroundColor: color, color: textColor || 'white', minHeight: '40px', boxSizing: 'border-box' }}
                onMouseDown={(e) => isEditable && e.stopPropagation()}
            >
                <div
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={handleBlur}
                    dangerouslySetInnerHTML={{ __html: node.text }}
                    className={`w-full outline-none ${isEditable ? 'cursor-text' : 'cursor-default'}`}
                />
            </div>

            {isHovered && isEditable && (
                 <div className="absolute top-0 right-0 flex space-x-0.5 transform -translate-y-1/2 translate-x-1/2 z-10">
                    <button onMouseDown={e => e.stopPropagation()} onClick={onAddChild} title="Add Child Node" className="bg-white rounded-full p-0.5 shadow hover:bg-green-100 text-green-600"><AddChildIcon/></button>
                    <button onMouseDown={e => e.stopPropagation()} onClick={onAddSibling} title="Add Sibling Node" className="bg-white rounded-full p-0.5 shadow hover:bg-blue-100 text-blue-600"><PlusCircleIcon/></button>
                    {!isRoot && <button onMouseDown={e => e.stopPropagation()} onClick={onDelete} title="Delete Node" className="bg-white rounded-full p-0.5 shadow hover:bg-red-100 text-red-600"><TrashIcon/></button>}
                </div>
            )}
        </div>
    );
};

const HierarchyRenderer: React.FC<{
    node: SmartArtNode, color: string, lineColor: string, isEditable: boolean, isRoot?: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void 
}> = ({ node, color, lineColor, isEditable, isRoot = true, onNodeAction }) => {
    const children = node.children || [];
    return (
        <div className="flex flex-col items-center space-y-4 p-4">
            <EditableNode 
                node={node} color={color} isEditable={isEditable} isRoot={isRoot}
                onTextChange={(text) => onNodeAction('text', node.id, text)}
                onAddChild={() => onNodeAction('addChild', node.id)}
                onAddSibling={() => onNodeAction('addSibling', node.id)}
                onDelete={() => onNodeAction('delete', node.id)}
            />
            {children.length > 0 && (
                <div className="flex space-x-8 relative pt-4">
                     <div className="absolute top-[-1px] left-1/2 h-4 w-px" style={{backgroundColor: lineColor}}/>
                     {children.length > 1 && <div className="absolute top-[-1px] left-0 right-0 h-px" style={{backgroundColor: lineColor}}/>}

                    {children.map((child) => (
                        <div key={child.id} className="relative">
                            <div className="absolute top-[-16px] left-1/2 h-4 w-px" style={{backgroundColor: lineColor}}/>
                            <HierarchyRenderer node={child} color={color} lineColor={lineColor} isEditable={isEditable} isRoot={false} onNodeAction={onNodeAction} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const BasicProcessRenderer: React.FC<{
     node: SmartArtNode, color: string, lineColor: string, isEditable: boolean,
     onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void 
}> = ({ node, color, lineColor, isEditable, onNodeAction }) => {
    const children = node.children || [];
    return (
    <div className="flex items-center justify-center space-x-2 p-4">
        {children.map((child, index) => (
            <React.Fragment key={child.id}>
                <EditableNode 
                    node={child} color={color} isEditable={isEditable} isRoot={false}
                    onTextChange={(text) => onNodeAction('text', child.id, text)}
                    onAddChild={() => onNodeAction('addChild', child.id)}
                    onAddSibling={() => onNodeAction('addSibling', child.id)}
                    onDelete={() => onNodeAction('delete', child.id)}
                />
                {index < children.length - 1 && (
                    <svg height="24" width="24" className="flex-shrink-0" viewBox="0 0 24 24">
                        <path d="M0 12 H24 M16 6 L24 12 L16 18" stroke={lineColor} strokeWidth="2" fill="none" />
                    </svg>
                )}
            </React.Fragment>
        ))}
    </div>
    );
};

const BasicChevronProcessRenderer: React.FC<{
    node: SmartArtNode, color: string, isEditable: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void
}> = ({ node, color, isEditable, onNodeAction }) => {
    const colors = ['#3B82F6', '#F97316', '#6B7280', '#FBBF24', '#2563EB', '#10B981'];
    const nodeWidth = 180;
    const nodeHeight = 100;
    const overlap = 40;

    return (
        <div className="flex items-center p-4">
            {(node.children || []).map((child, index) => (
                <div
                    key={child.id}
                    className="relative"
                    style={{
                        width: `${nodeWidth}px`,
                        height: `${nodeHeight}px`,
                        marginLeft: index > 0 ? `-${overlap}px` : '0',
                        zIndex: index,
                    }}
                >
                    <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon
                            points="0,0 75,0 100,50 75,100 0,100"
                            fill={colors[index % colors.length]}
                        />
                    </svg>
                    <div className="relative w-full h-full flex items-center justify-center text-white px-2 z-10" style={{paddingRight: `${overlap}px`}}>
                        <EditableNode
                            node={child}
                            color="transparent"
                            textColor="white"
                            isEditable={isEditable}
                            isRoot={false}
                            onTextChange={(text) => onNodeAction('text', child.id, text)}
                            onAddChild={() => onNodeAction('addChild', child.id)}
                            onAddSibling={() => onNodeAction('addSibling', child.id)}
                            onDelete={() => onNodeAction('delete', child.id)}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};


const VerticalChevronRenderer: React.FC<{
    node: SmartArtNode, color: string, lineColor: string, isEditable: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void 
}> = ({ node, color, lineColor, isEditable, onNodeAction }) => {
   const children = node.children || [];
   return (
       <div className="flex flex-col items-center p-4 space-y-2">
           {children.map((child, index) => (
               <React.Fragment key={child.id}>
                   <EditableNode
                       node={child} color={color} isEditable={isEditable} isRoot={false}
                       onTextChange={(text) => onNodeAction('text', child.id, text)}
                       onAddChild={() => onNodeAction('addChild', child.id)}
                       onAddSibling={() => onNodeAction('addSibling', child.id)}
                       onDelete={() => onNodeAction('delete', child.id)}
                   />
                   {index < children.length - 1 && (
                       <svg height="32" width="60" className="flex-shrink-0" viewBox="0 0 60 32">
                           <path d="M10 0 L50 0 L30 20 Z" fill={lineColor} opacity="0.5" />
                           <path d="M10 12 L50 12 L30 32 Z" fill={lineColor} />
                       </svg>
                   )}
               </React.Fragment>
           ))}
       </div>
   );
};

const StepUpRenderer: React.FC<{
    node: SmartArtNode, color: string, lineColor: string, isEditable: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void 
}> = ({ node, color, lineColor, isEditable, onNodeAction }) => {
    const reversedChildren = [...(node.children || [])].reverse();
    return (
        <div className="p-4 flex flex-col items-start space-y-2">
            {reversedChildren.map((child, index) => (
                <div key={child.id} style={{ paddingLeft: `${index * 60}px` }} className="relative">
                    <EditableNode
                        node={child} color={color} isEditable={isEditable} isRoot={false}
                        onTextChange={(text) => onNodeAction('text', child.id, text)}
                        onAddChild={() => onNodeAction('addChild', child.id)}
                        onAddSibling={() => onNodeAction('addSibling', child.id)}
                        onDelete={() => onNodeAction('delete', child.id)}
                    />
                    {index > 0 && (
                        <svg className="absolute" style={{ left: `${index * 60 - 30}px`, bottom: '50%'}} width="30" height="30" viewBox="0 0 30 30">
                            <path d="M25 5 C 15 5, 15 25, 5 25" stroke={lineColor} strokeWidth="2" fill="none" />
                        </svg>
                    )}
                </div>
            ))}
        </div>
    );
};

const CircularBendingRenderer: React.FC<{
    node: SmartArtNode, color: string, lineColor: string, isEditable: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void 
}> = ({ node, color, lineColor, isEditable, onNodeAction }) => {
    const children = node.children || [];
    const count = children.length;
    if (count === 0) return null;

    const totalAngle = Math.min(count - 1, 4) * (Math.PI / 4); // Max 4 * 45 deg = 180 deg
    const radius = Math.max(100, count * 30);

    return (
        <div className="w-full h-full relative flex items-center justify-center p-8" style={{minHeight: `${radius + 60}px`}}>
            {children.map((child, index) => {
                const angle = (count > 1 ? (index / (count - 1)) * totalAngle : 0) - (totalAngle / 2);
                const x = radius * Math.cos(angle - Math.PI/2);
                const y = radius * Math.sin(angle - Math.PI/2);
                return (
                    <div key={child.id} style={{ position: 'absolute', transform: `translate(${x}px, ${y}px)` }}>
                         <EditableNode
                            node={child} color={color} isEditable={isEditable} isRoot={false}
                            onTextChange={(text) => onNodeAction('text', child.id, text)}
                            onAddChild={() => onNodeAction('addChild', child.id)}
                            onAddSibling={() => onNodeAction('addSibling', child.id)}
                            onDelete={() => onNodeAction('delete', child.id)}
                         />
                    </div>
                );
            })}
             {children.length > 1 && (
                 <svg className="w-full h-full absolute top-0 left-0 overflow-visible" viewBox={`-${radius+50} -${radius+50} ${2*(radius+50)} ${2*(radius+50)}`}>
                    <path
                        d={`M ${radius * Math.cos(-totalAngle/2 - Math.PI/2)} ${radius * Math.sin(-totalAngle/2 - Math.PI/2)} A ${radius} ${radius} 0 0 1 ${radius * Math.cos(totalAngle/2 - Math.PI/2)} ${radius * Math.sin(totalAngle/2 - Math.PI/2)}`}
                        stroke={lineColor}
                        strokeWidth="2"
                        fill="none"
                    />
                </svg>
             )}
        </div>
    );
};


const CycleRenderer: React.FC<{ 
    node: SmartArtNode, color: string, lineColor: string, isEditable: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void 
}> = ({ node, color, lineColor, isEditable, onNodeAction }) => {
    const children = node.children || [];
    const count = children.length;
    if (count === 0) return null;
    
    const circumference = Math.max(300, children.length * 130);
    const radius = circumference / (2 * Math.PI);
    const viewBoxSize = (radius + 60) * 2;

    return (
        <div className="w-full h-full relative flex items-center justify-center p-4">
            {children.map((child, index) => {
                const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
                const x = radius * Math.cos(angle);
                const y = radius * Math.sin(angle);
                return (
                    <div key={child.id} style={{ position: 'absolute', transform: `translate(${x}px, ${y}px)` }}>
                         <EditableNode 
                            node={child} color={color} isEditable={isEditable} isRoot={false}
                            onTextChange={(text) => onNodeAction('text', child.id, text)}
                            onAddChild={() => onNodeAction('addChild', child.id)}
                            onAddSibling={() => onNodeAction('addSibling', child.id)}
                            onDelete={() => onNodeAction('delete', child.id)}
                         />
                    </div>
                );
            })}
             <svg className="w-full h-full absolute top-0 left-0 overflow-visible" viewBox={`-${viewBoxSize/2} -${viewBoxSize/2} ${viewBoxSize} ${viewBoxSize}`}>
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill={lineColor} />
                    </marker>
                </defs>
                <circle cx="0" cy="0" r={radius} stroke={lineColor} strokeWidth="2" fill="none" strokeDasharray="15, 10" marker-end="url(#arrowhead)"/>
            </svg>
        </div>
    );
};

const ContinuousArrowRenderer: React.FC<{
     node: SmartArtNode, color: string, lineColor: string, isEditable: boolean,
     onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void 
}> = ({ node, color, lineColor, isEditable, onNodeAction }) => {
    const children = node.children || [];
    const count = children.length;
    if (count === 0) return null;
    const nodeWidth = 150;
    const arrowHeadWidth = 25;
    const totalContentWidth = nodeWidth * count;
    const totalSvgWidth = totalContentWidth + arrowHeadWidth;

    return (
        <div className="relative p-4 inline-block">
            <svg className="absolute top-0 left-0 w-full h-full" viewBox={`0 0 ${totalSvgWidth} 100`} preserveAspectRatio="none">
                <path 
                    d={`M0 50 L${arrowHeadWidth} 0 H${totalContentWidth} L${totalSvgWidth} 50 L${totalContentWidth} 100 H${arrowHeadWidth} Z`} 
                    fill={color}
                />
                {Array.from({length: count - 1}).map((_, i) => (
                    <line 
                        key={i}
                        x1={arrowHeadWidth + (i + 1) * nodeWidth} y1="0"
                        x2={arrowHeadWidth + (i + 1) * nodeWidth} y2="100"
                        stroke="white" strokeWidth="2" opacity="0.7"
                    />
                ))}
            </svg>
            <div className="relative flex items-stretch h-full min-h-[100px]" style={{width: `${totalSvgWidth}px`}}>
                <div className="w-full flex items-stretch" style={{paddingLeft: `${arrowHeadWidth}px`}}>
                    {children.map(child => (
                        <div key={child.id} className="flex-1 flex items-center justify-center p-2 z-10" style={{width: `${nodeWidth}px`}}>
                            <EditableNode
                                node={child} color="transparent" textColor="white" isEditable={isEditable} isRoot={false}
                                onTextChange={(text) => onNodeAction('text', child.id, text)}
                                onAddChild={() => onNodeAction('addChild', child.id)}
                                onAddSibling={() => onNodeAction('addSibling', child.id)}
                                onDelete={() => onNodeAction('delete', child.id)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const TimelineRenderer: React.FC<{
     node: SmartArtNode, color: string, lineColor: string, isEditable: boolean,
     onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void 
}> = ({ node, color, lineColor, isEditable, onNodeAction }) => {
    const children = node.children || [];
    return (
        <div className="relative flex justify-center p-12" style={{minWidth: `${children.length * 150}px`}}>
            <div className="absolute top-1/2 left-8 right-8 h-1 -mt-0.5" style={{backgroundColor: lineColor}}/>
            <div className="flex items-center justify-center space-x-12">
                {children.map((child, index) => (
                    <div key={child.id} className="relative flex" style={{flexDirection: index % 2 === 0 ? 'column-reverse' : 'column'}}>
                        <div className="h-12 w-0.5 self-center" style={{backgroundColor: lineColor}}/>
                        <div className="absolute top-1/2 left-1/2 rounded-full w-3 h-3 bg-white border-2 -mt-1.5 -ml-1.5" style={{borderColor: lineColor}}/>
                        <div className="mt-4 mb-4">
                            <EditableNode
                                node={child} color={color} isEditable={isEditable} isRoot={false}
                                onTextChange={(text) => onNodeAction('text', child.id, text)}
                                onAddChild={() => onNodeAction('addChild', child.id)}
                                onAddSibling={() => onNodeAction('addSibling', child.id)}
                                onDelete={() => onNodeAction('delete', child.id)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FunnelRenderer: React.FC<{
     node: SmartArtNode, color: string, lineColor: string, isEditable: boolean,
     onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void 
}> = ({ node, color, lineColor, isEditable, onNodeAction }) => {
    const children = node.children || [];
    return (
        <div className="relative flex flex-col items-center p-4 space-y-2">
            <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <polygon points="0,0 100,0 80,100 20,100" fill={lineColor} opacity="0.2"/>
            </svg>
            {children.map((child, index) => (
                <div key={child.id} className="relative z-10" style={{width: `${100 - (children.length > 0 ? (index / children.length) : 0) * 40}%`}}>
                    <EditableNode
                        node={child} color={color} isEditable={isEditable} isRoot={false}
                        onTextChange={(text) => onNodeAction('text', child.id, text)}
                        onAddChild={() => onNodeAction('addChild', child.id)}
                        onAddSibling={() => onNodeAction('addSibling', child.id)}
                        onDelete={() => onNodeAction('delete', child.id)}
                    />
                </div>
            ))}
        </div>
    )
}

const GearsRenderer: React.FC<{
     node: SmartArtNode, color: string, lineColor: string, isEditable: boolean,
     onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void 
}> = ({ node, color, lineColor, isEditable, onNodeAction }) => {
    const GearShape = ({r, teeth, rot}: {r: number, teeth: number, rot: number}) => {
        let path = "";
        const innerR = r * 0.8;
        const outerR = r * 1.2;
        
        for(let i=0; i < teeth; i++) {
            const angle = (i * 2 * Math.PI / teeth) + rot;
            const nextAngle = ((i+1) * 2 * Math.PI / teeth) + rot;
            const sa = angle - Math.PI / (teeth * 2);
            const ea = angle + Math.PI / (teeth * 2);
            
            path += ` M ${innerR * Math.cos(sa)} ${innerR * Math.sin(sa)}`
            + ` A ${innerR} ${innerR} 0 0 1 ${innerR * Math.cos(ea)} ${innerR * Math.sin(ea)}`
            + ` L ${outerR * Math.cos(ea)} ${outerR * Math.sin(ea)}`
            + ` A ${outerR} ${outerR} 0 0 1 ${outerR * Math.cos(nextAngle - Math.PI / (teeth*2))} ${outerR * Math.sin(nextAngle - Math.PI / (teeth*2))}`
            + ` L ${innerR * Math.cos(nextAngle - Math.PI / (teeth*2))} ${innerR * Math.sin(nextAngle - Math.PI / (teeth*2))}`
        }
        return <path d={path} fill={lineColor} stroke={lineColor} strokeWidth="1" />;
    }
    
    const positions = [
        {x: 80, y: 80, r: 40, rot: 0},
        {x: 165, y: 125, r: 50, rot: 15},
        {x: 80, y: 190, r: 35, rot: -10},
        {x: 220, y: 190, r: 45, rot: 25},
    ];

    return (
        <div className="p-4">
            <svg width="100%" height="100%" viewBox="0 0 320 320">
                {(node.children || []).map((child, index) => {
                    const pos = positions[index % positions.length];
                    const textWidth = pos.r * 1.6;
                    const textHeight = pos.r;
                     return (
                         <g key={child.id} transform={`translate(${pos.x}, ${pos.y})`}>
                            <GearShape r={pos.r} teeth={8} rot={pos.rot}/>
                            <foreignObject x={-textWidth/2} y={-textHeight/2} width={textWidth} height={textHeight}>
                                <div className="w-full h-full flex items-center justify-center p-1">
                                     <EditableNode
                                        node={child} color={color} isEditable={isEditable} isRoot={false}
                                        onTextChange={(text) => onNodeAction('text', child.id, text)}
                                        onAddChild={() => onNodeAction('addChild', child.id)}
                                        onAddSibling={() => onNodeAction('addSibling', child.id)}
                                        onDelete={() => onNodeAction('delete', child.id)}
                                    />
                                </div>
                            </foreignObject>
                         </g>
                     )
                })}
            </svg>
        </div>
    )
}

const AccentProcessRenderer: React.FC<{
    node: SmartArtNode, color: string, isEditable: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void 
}> = ({ node, color, isEditable, onNodeAction }) => {
    const colors = ['#F97316', '#6B7280', '#FBBF24', '#3B82F6', '#10B981'];
    const accentColors = ['#FB923C', '#9CA3AF', '#FCD34D', '#60A5FA', '#34D399'];
    const children = node.children || [];

    return (
        <div className="flex items-center justify-center space-x-8 p-4">
            {children.map((child, index) => (
                <React.Fragment key={child.id}>
                    <div className="relative w-36 h-24">
                        <div className="absolute top-0 left-0 w-32 h-20 rounded-lg shadow" style={{backgroundColor: accentColors[index % accentColors.length]}}></div>
                        <div className="absolute bottom-0 right-0 w-32 h-20 rounded-lg shadow-lg flex items-center justify-center" style={{backgroundColor: colors[index % colors.length]}}>
                            <EditableNode
                                node={child}
                                color="transparent"
                                isEditable={isEditable}
                                isRoot={false}
                                onTextChange={(text) => onNodeAction('text', child.id, text)}
                                onAddChild={() => onNodeAction('addChild', child.id)}
                                onAddSibling={() => onNodeAction('addSibling', child.id)}
                                onDelete={() => onNodeAction('delete', child.id)}
                            />
                        </div>
                    </div>

                    {index < children.length - 1 && (
                        <svg height="24" width="24" viewBox="0 0 24 24" className="flex-shrink-0 text-gray-500">
                            <path d="M0 12 L18 12 M12 6 L18 12 L12 18" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

const CircleArrowProcessRenderer: React.FC<{
    node: SmartArtNode, isEditable: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void
}> = ({ node, isEditable, onNodeAction }) => {
    const colors = ['#F97316', '#6B7280', '#FBBF24', '#3B82F6', '#10B981'];
    return (
        <div className="flex flex-col items-center p-4 -space-y-8">
            {(node.children || []).map((child, index) => (
                <div key={child.id} className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                        <defs>
                            <marker id={`arrowhead-${child.id}`} markerWidth="5" markerHeight="3.5" refX="4" refY="1.75" orient="auto">
                                <polygon points="0 0, 5 1.75, 0 3.5" fill={colors[index % colors.length]} />
                            </marker>
                        </defs>
                        <path 
                            d="M 80,50 A 30 30 0 1 1 50, 20"
                            stroke={colors[index % colors.length]}
                            strokeWidth="8"
                            fill="none"
                            markerEnd={`url(#arrowhead-${child.id})`}
                        />
                    </svg>
                    <div className="w-2/3">
                        <EditableNode
                            node={child}
                            color="transparent"
                            textColor="#374151"
                            isEditable={isEditable}
                            isRoot={false}
                            onTextChange={(text) => onNodeAction('text', child.id, text)}
                            onAddChild={() => onNodeAction('addChild', child.id)}
                            onAddSibling={() => onNodeAction('addSibling', child.id)}
                            onDelete={() => onNodeAction('delete', child.id)}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

const DetailedProcessRenderer: React.FC<{
    node: SmartArtNode, isEditable: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void
}> = ({ node, isEditable, onNodeAction }) => {
    const colors = [
        { from: '#F97316', to: '#D97706' },
        { from: '#6B7280', to: '#4B5563' },
        { from: '#FBBF24', to: '#F59E0B' },
        { from: '#3B82F6', to: '#2563EB' },
    ];
    const children = node.children || [];
    
    return (
        <div className="flex items-stretch justify-center p-4">
            {children.map((child, index) => (
                <React.Fragment key={child.id}>
                    <div
                        className="w-56 h-28 rounded-md shadow-lg flex items-center justify-center p-2 text-white"
                        style={{ background: `linear-gradient(to bottom, ${colors[index % colors.length].from}, ${colors[index % colors.length].to})`}}
                    >
                         <EditableNode
                            node={child}
                            color="transparent"
                            isEditable={isEditable}
                            isRoot={false}
                            onTextChange={(text) => onNodeAction('text', child.id, text)}
                            onAddChild={() => onNodeAction('addChild', child.id)}
                            onAddSibling={() => onNodeAction('addSibling', child.id)}
                            onDelete={() => onNodeAction('delete', child.id)}
                        />
                    </div>
                    {index < children.length - 1 && (
                       <svg width="24" height="24" viewBox="0 0 24 24" className="z-10 -ml-3 self-center">
                            <path d="M0 4 L12 12 L0 20 Z" fill="white"/>
                       </svg>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

const ContinuousCycleRenderer: React.FC<{ 
    node: SmartArtNode, color: string, lineColor: string, isEditable: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void 
}> = ({ node, color, lineColor, isEditable, onNodeAction }) => {
    const children = node.children || [];
    const count = children.length;
    if (count === 0) return null;
    
    const radius = Math.max(120, count * 35);
    const center = radius + 20;
    const strokeWidth = 25;

    const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (r * Math.cos(angleInRadians)),
            y: centerY + (r * Math.sin(angleInRadians))
        };
    };

    return (
        <div className="w-full h-full relative flex items-center justify-center p-4" style={{minWidth: center*2, minHeight: center*2}}>
            <svg className="absolute w-full h-full" viewBox={`0 0 ${center*2} ${center*2}`}>
                <defs>
                    <marker id={`cont-arrow-${node.id}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L6,3 L0,6 Z" fill={lineColor} />
                    </marker>
                </defs>
                {children.map((child, index) => {
                    const angleStep = 360 / count;
                    const startAngle = index * angleStep;
                    const endAngle = (index + 1) * angleStep - 5; // -5 for gap
                    
                    const start = polarToCartesian(center, center, radius, endAngle);
                    const end = polarToCartesian(center, center, radius, startAngle);

                    const d = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${angleStep > 180 ? 1 : 0} 0 ${end.x} ${end.y}`;

                    return (
                        <path key={child.id} d={d} stroke={lineColor} strokeWidth={strokeWidth} fill="none" markerEnd={`url(#cont-arrow-${node.id})`} />
                    );
                })}
            </svg>
            {children.map((child, index) => {
                const angle = ((index + 0.5) / count) * 2 * Math.PI - Math.PI / 2;
                const x = radius * Math.cos(angle);
                const y = radius * Math.sin(angle);
                return (
                    <div key={child.id} style={{ position: 'absolute', transform: `translate(${x}px, ${y}px)` }}>
                         <EditableNode 
                            node={child} color={color} isEditable={isEditable} isRoot={false}
                            onTextChange={(text) => onNodeAction('text', child.id, text)}
                            onAddChild={() => onNodeAction('addChild', child.id)}
                            onAddSibling={() => onNodeAction('addSibling', child.id)}
                            onDelete={() => onNodeAction('delete', child.id)}
                         />
                    </div>
                );
            })}
        </div>
    );
};

const SegmentedCycleRenderer: React.FC<{
    node: SmartArtNode, isEditable: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void 
}> = ({ node, isEditable, onNodeAction }) => {
    const children = node.children || [];
    const count = children.length;
    if (count === 0) return null;

    const colors = ['#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#FBBF24', '#EC4899'];
    const radius = Math.max(150, count * 40);
    const center = radius + 20;

    const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return { x: cx + (r * Math.cos(angleInRadians)), y: cy + (r * Math.sin(angleInRadians)) };
    };

    return (
        <div className="relative" style={{width: center*2, height: center*2}}>
            <svg className="absolute w-full h-full" viewBox={`0 0 ${center*2} ${center*2}`}>
                {children.map((child, index) => {
                    const angleStep = 360 / count;
                    const startAngle = index * angleStep;
                    const endAngle = (index + 1) * angleStep;
                    
                    const start = polarToCartesian(center, center, radius, endAngle);
                    const end = polarToCartesian(center, center, radius, startAngle);

                    const largeArcFlag = angleStep <= 180 ? "0" : "1";
                    const d = `M ${center},${center} L ${start.x},${start.y} A ${radius},${radius} 0 ${largeArcFlag} 0 ${end.x},${end.y} Z`;
                    
                    return <path key={child.id} d={d} fill={colors[index % colors.length]} stroke="white" strokeWidth="2" />;
                })}
            </svg>
            {children.map((child, index) => {
                const angle = ((index + 0.5) / count) * 2 * Math.PI - Math.PI / 2;
                const textRadius = radius * 0.6;
                const x = center + textRadius * Math.cos(angle);
                const y = center + textRadius * Math.sin(angle);
                return (
                    <div key={child.id} className="absolute" style={{ top: y, left: x, transform: 'translate(-50%, -50%)' }}>
                        <EditableNode 
                            node={child} color="transparent" textColor="white" isEditable={isEditable} isRoot={false}
                            onTextChange={(text) => onNodeAction('text', child.id, text)}
                            onAddChild={() => onNodeAction('addChild', child.id)}
                            onAddSibling={() => onNodeAction('addSibling', child.id)}
                            onDelete={() => onNodeAction('delete', child.id)}
                         />
                    </div>
                );
            })}
        </div>
    );
};

const RadialCycleRenderer: React.FC<{
    node: SmartArtNode, color: string, lineColor: string, isEditable: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void
}> = ({ node, color, lineColor, isEditable, onNodeAction }) => {
    const children = node.children || [];
    const childrenCount = children.length;
    const radius = Math.max(150, childrenCount * 30);
    const center = radius + 60; // Add padding for outer nodes

    return (
        <div className="relative" style={{ width: center * 2, height: center * 2 }}>
            <svg className="absolute w-full h-full" viewBox={`0 0 ${center*2} ${center*2}`}>
                {children.map((child, index) => {
                    const angle = (index / childrenCount) * 2 * Math.PI - Math.PI / 2;
                    const x = center + radius * Math.cos(angle);
                    const y = center + radius * Math.sin(angle);
                    return <line key={child.id} x1={center} y1={center} x2={x} y2={y} stroke={lineColor} strokeWidth="2" />;
                })}
            </svg>
            <div className="absolute" style={{ top: center, left: center, transform: 'translate(-50%, -50%)' }}>
                <EditableNode
                    node={node} color={color} isEditable={isEditable} isRoot={true}
                    onTextChange={(text) => onNodeAction('text', node.id, text)}
                    onAddChild={() => onNodeAction('addChild', node.id)}
                    onAddSibling={() => onNodeAction('addSibling', node.id)}
                    onDelete={() => onNodeAction('delete', node.id)}
                />
            </div>
            {children.map((child, index) => {
                const angle = (index / childrenCount) * 2 * Math.PI - Math.PI / 2;
                const x = center + radius * Math.cos(angle);
                const y = center + radius * Math.sin(angle);
                return (
                    <div key={child.id} className="absolute" style={{ top: y, left: x, transform: 'translate(-50%, -50%)' }}>
                        <EditableNode
                            node={child} color={color} isEditable={isEditable} isRoot={false}
                            onTextChange={(text) => onNodeAction('text', child.id, text)}
                            onAddChild={() => onNodeAction('addChild', child.id)}
                            onAddSibling={() => onNodeAction('addSibling', child.id)}
                            onDelete={() => onNodeAction('delete', child.id)}
                        />
                    </div>
                );
            })}
        </div>
    );
};

const BasicPyramidRenderer: React.FC<{
    node: SmartArtNode, color: string, isEditable: boolean, inverted?: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void
}> = ({ node, color, isEditable, inverted = false, onNodeAction }) => {
    const levels = node.children || [];
    const n = levels.length;
    if (n === 0) return null;
    const colors = ['#F97316', '#6B7280', '#FBBF24', '#3B82F6', '#10B981', '#EC4899'];
    
    return (
        <div className="relative" style={{width: 350, height: 300}}>
            <svg className="absolute w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {levels.map((level, i) => {
                    const idx = inverted ? n - 1 - i : i;
                    const topY = (idx / n) * 100;
                    const bottomY = ((idx + 1) / n) * 100;
                    
                    const topWidth = inverted ? (1 - (idx / n)) * 100 : ((idx) / n) * 100;
                    const bottomWidth = inverted ? (1 - ((idx + 1) / n)) * 100 : ((idx + 1) / n) * 100;

                    const points = [
                        `${50 - topWidth/2},${topY}`,
                        `${50 + topWidth/2},${topY}`,
                        `${50 + bottomWidth/2},${bottomY}`,
                        `${50 - bottomWidth/2},${bottomY}`,
                    ].join(' ');

                    return <polygon key={level.id} points={points} fill={colors[i % colors.length]} stroke="white" strokeWidth="0.5" />;
                })}
            </svg>
            {levels.map((level, i) => {
                 const idx = inverted ? n - 1 - i : i;
                 const y = (idx + 0.5) / n * 100;
                 const segmentWidthPercent = inverted 
                    ? (1 - ((idx + 0.5) / n)) * 100 
                    : ((idx + 0.5) / n) * 100;

                 return (
                     <div key={level.id} className="absolute" style={{top: `${y}%`, left: '50%', width: `${segmentWidthPercent}%`, transform: 'translate(-50%, -50%)'}}>
                         <EditableNode 
                            node={level} color="transparent" textColor="white" isEditable={isEditable} isRoot={false}
                            onTextChange={(text) => onNodeAction('text', level.id, text)}
                            onAddChild={() => onNodeAction('addChild', level.id)}
                            onAddSibling={() => onNodeAction('addSibling', level.id)}
                            onDelete={() => onNodeAction('delete', level.id)}
                        />
                     </div>
                 );
            })}
        </div>
    );
};

const PyramidListRenderer: React.FC<{
    node: SmartArtNode, color: string, lineColor: string, isEditable: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void
}> = ({ node, color, lineColor, isEditable, onNodeAction }) => {
    const levels = node.children || [];
    const n = levels.length;
    if (n === 0) return null;
    const colors = ['#F97316', '#6B7280', '#FBBF24', '#3B82F6', '#10B981', '#EC4899'];

    return (
        <div className="flex items-stretch" style={{width: 650, height: 350}}>
            {/* Pyramid Side (purely visual) */}
            <div className="relative" style={{width: 250, height: '100%'}}>
                <svg className="absolute w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {levels.map((level, i) => {
                        const topY = (i / n) * 100;
                        const bottomY = ((i + 1) / n) * 100;
                        const topWidth = (i / n) * 100;
                        const bottomWidth = ((i + 1) / n) * 100;
                        const points = [`${50 - topWidth/2},${topY}`, `${50 + topWidth/2},${topY}`, `${50 + bottomWidth/2},${bottomY}`, `${50 - bottomWidth/2},${bottomY}`].join(' ');
                        return <polygon key={level.id} points={points} fill={colors[i % colors.length]} stroke="white" strokeWidth="0.5" />;
                    })}
                </svg>
            </div>
            {/* List Side (interactive) */}
            <div className="flex-1 flex flex-col justify-evenly pl-8">
                {levels.map((level) => (
                    <div key={level.id} className="relative">
                        <EditableNode 
                            node={level} 
                            color="#FFFFFF" 
                            textColor="#374151" 
                            isEditable={isEditable} 
                            isRoot={false}
                            onTextChange={(text) => onNodeAction('text', level.id, text)}
                            onAddChild={() => onNodeAction('addChild', level.id)}
                            onAddSibling={() => onNodeAction('addSibling', level.id)}
                            onDelete={() => onNodeAction('delete', level.id)}
                        />
                         <div 
                            className="absolute right-full top-1/2 w-4 h-px -translate-y-1/2"
                            style={{backgroundColor: lineColor, marginRight: '0.5rem'}}
                         />
                    </div>
                ))}
            </div>
        </div>
    );
}

const SegmentedPyramidRenderer: React.FC<{
    node: SmartArtNode, color: string, lineColor: string, isEditable: boolean,
    onNodeAction: (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => void
}> = ({ node, color, lineColor, isEditable, onNodeAction }) => {
    const levels = node.children || [];
    const n = levels.length;
    if (n === 0) return null;

    return (
        <div className="relative" style={{width: 400, height: 350}}>
            <svg className="absolute w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polygon points="50,0 100,100 0,100" fill={color} />
                {Array.from({length: n}).map((_, i) => {
                    const y = (i + 1) / n * 100;
                    const width = (i + 1) / n * 100;
                    return <line key={`h-${i}`} x1={50 - width/2} y1={y} x2={50 + width/2} y2={y} stroke={lineColor} strokeWidth="0.5"/>
                })}
                 {Array.from({length: n-1}).map((_, i) => {
                    const x1 = 50 - ((i+1) / n * 50);
                    const y1 = (i+1) / n * 100;
                    return <line key={`d1-${i}`} x1={50} y1={0} x2={x1} y2={y1} stroke={lineColor} strokeWidth="0.5"/>
                })}
                {Array.from({length: n-1}).map((_, i) => {
                    const x1 = 50 + ((i+1) / n * 50);
                    const y1 = (i+1) / n * 100;
                    return <line key={`d2-${i}`} x1={50} y1={0} x2={x1} y2={y1} stroke={lineColor} strokeWidth="0.5"/>
                })}
            </svg>
             {levels.map((level, i) => {
                 const y = (i + 0.5) / n * 100;
                 const segmentWidthPercent = ((i + 0.5) / n) * 100;
                 return (
                     <div key={level.id} className="absolute" style={{top: `${y}%`, left: '50%', width: `${segmentWidthPercent}%`, transform: 'translate(-50%, -50%)'}}>
                         <EditableNode 
                            node={level} color="transparent" textColor="white" isEditable={isEditable} isRoot={false}
                            onTextChange={(text) => onNodeAction('text', level.id, text)}
                            onAddChild={() => onNodeAction('addChild', level.id)}
                            onAddSibling={() => onNodeAction('addSibling', level.id)}
                            onDelete={() => onNodeAction('delete', level.id)}
                        />
                     </div>
                 );
            })}
        </div>
    )
};


const SmartArtEditor: React.FC<SmartArtEditorProps> = ({ element, onUpdate }) => {
    const { smartArtType, data, nodeColor, lineColor, width, height } = element;
    const isEditable = !!onUpdate;
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (containerRef.current && contentRef.current) {
            const { offsetWidth: contentWidth, offsetHeight: contentHeight } = contentRef.current;

            if (contentWidth > 0 && contentHeight > 0) {
                const scaleX = width / contentWidth;
                const scaleY = height / contentHeight;
                const scale = Math.min(scaleX, scaleY);
                
                containerRef.current.style.transform = `scale(${scale})`;
            }
        }
    }, [width, height, data]);

    const handleNodeAction = (action: 'text' | 'addChild' | 'addSibling' | 'delete', nodeId: string, payload?: any) => {
        if (!onUpdate || !data) return;
        
        let newData: SmartArtNode | null = data;
        const newNode: SmartArtNode = { id: uuidv4(), text: 'New', children: [] };

        switch(action) {
            case 'text':
                newData = updateNodeText(data, nodeId, payload);
                break;
            case 'addChild':
                newData = addChildNode(data, nodeId, newNode);
                break;
            case 'addSibling':
                newData = addSiblingNode(data, nodeId, newNode);
                break;
            case 'delete':
                newData = deleteNodeFromTree(data, nodeId);
                break;
        }

        onUpdate({ data: newData || { id: uuidv4(), text: 'Diagram', children: [] }});
    }

    const renderSmartArt = () => {
        const props = {
            node: data,
            color: nodeColor,
            lineColor: lineColor,
            isEditable,
            onNodeAction: handleNodeAction
        };
        switch (smartArtType) {
            case SmartArtType.HIERARCHY:
                return <HierarchyRenderer {...props} />;
            case SmartArtType.BASIC_PROCESS:
                return <BasicProcessRenderer {...props} />;
            case SmartArtType.BASIC_CHEVRON_PROCESS:
                return <BasicChevronProcessRenderer {...props} />;
            case SmartArtType.VERTICAL_CHEVRON_LIST:
                return <VerticalChevronRenderer {...props} />;
            case SmartArtType.STEP_UP_PROCESS:
                return <StepUpRenderer {...props} />;
            case SmartArtType.CIRCULAR_BENDING_PROCESS:
                return <CircularBendingRenderer {...props} />;
            case SmartArtType.CONTINUOUS_ARROW_PROCESS:
                return <ContinuousArrowRenderer {...props} />;
            case SmartArtType.TIMELINE:
                return <TimelineRenderer {...props} />;
            case SmartArtType.FUNNEL:
                return <FunnelRenderer {...props} />;
            case SmartArtType.GEARS:
                return <GearsRenderer {...props} />;
            case SmartArtType.ACCENT_PROCESS:
                return <AccentProcessRenderer {...props} />;
            case SmartArtType.CIRCLE_ARROW_PROCESS:
                return <CircleArrowProcessRenderer {...props} />;
            case SmartArtType.DETAILED_PROCESS:
                return <DetailedProcessRenderer {...props} />;
            case SmartArtType.CYCLE:
                 return <CycleRenderer {...props} />;
            case SmartArtType.CONTINUOUS_CYCLE:
                return <ContinuousCycleRenderer {...props} />;
            case SmartArtType.SEGMENTED_CYCLE:
                return <SegmentedCycleRenderer {...props} />;
            case SmartArtType.RADIAL_CYCLE:
                return <RadialCycleRenderer {...props} />;
            case SmartArtType.RELATIONSHIP:
                return <RadialCycleRenderer {...props} />;
            case SmartArtType.BASIC_PYRAMID:
                return <BasicPyramidRenderer {...props} />;
            case SmartArtType.INVERTED_PYRAMID:
                return <BasicPyramidRenderer {...props} inverted={true} />;
            case SmartArtType.PYRAMID_LIST:
                return <PyramidListRenderer {...props} />;
            case SmartArtType.SEGMENTED_PYRAMID:
                return <SegmentedPyramidRenderer {...props} />;
            default:
                return <div className="text-gray-500">Unsupported SmartArt type</div>;
        }
    };

    return (
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <div ref={containerRef} style={{ transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}>
                <div ref={contentRef} style={{ display: 'inline-block' }}>
                    {renderSmartArt()}
                </div>
            </div>
        </div>
    );
};

export default SmartArtEditor;