import React from 'react';
import { LeafNode } from '@/types/nodes';
import { Image } from 'lucide-react';

interface LeafViewProps {
  node: LeafNode;
  outline: boolean;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const LeafView: React.FC<LeafViewProps> = ({ node, outline, isSelected, onSelect }) => {
  const { textProps, imageProps, backgroundProps, padding } = node;
  
  return (
    <div
      className={`
        h-full w-full cursor-pointer transition-all duration-200
        ${outline ? 'border-2 border-dashed border-gray-300' : ''}
        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
      style={{
        backgroundColor: backgroundProps.color,
        opacity: backgroundProps.opacity,
        padding: `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
    >
      {node.contentType === "text" ? (
        <div
          className="h-full w-full flex items-start"
          style={{
            fontSize: textProps.fontSize,
            color: textProps.textGradient || textProps.color,
            fontWeight: textProps.fontWeight100 || textProps.fontWeight,
            textAlign: textProps.textAlign,
            fontFamily: textProps.fontFamily,
            lineHeight: textProps.lineHeight,
            letterSpacing: textProps.letterSpacing,
            fontStyle: textProps.italic ? 'italic' : 'normal',
            textDecoration: [
              textProps.underline && 'underline',
              textProps.strikethrough && 'line-through'
            ].filter(Boolean).join(' ') || 'none',
            textShadow: textProps.textShadow !== 'none' ? textProps.textShadow : undefined,
            textTransform: textProps.textTransform,
            wordSpacing: textProps.wordSpacing,
            background: textProps.textBackground !== 'transparent' ? 
              `${textProps.textBackground}${Math.round(textProps.textBackgroundOpacity * 255).toString(16).padStart(2, '0')}` : 
              undefined,
            backgroundImage: textProps.textGradient ? textProps.textGradient : undefined,
            WebkitBackgroundClip: textProps.textGradient ? 'text' : undefined,
            WebkitTextFillColor: textProps.textGradient ? 'transparent' : undefined,
          }}
        >
          <div className="whitespace-pre-wrap break-words">
            {textProps.text || <span className="text-gray-400 italic">Click to edit text...</span>}
          </div>
        </div>
      ) : (
        <div className="h-full w-full relative overflow-hidden">
          {imageProps.url ? (
            <img
              src={imageProps.url}
              alt="Content"
              className="w-full h-full"
              style={{
                objectFit: imageProps.objectFit,
                opacity: imageProps.opacity,
                borderRadius: imageProps.borderRadius,
              }}
            />
          ) : (
            <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-400">
              <Image className="h-8 w-8" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
