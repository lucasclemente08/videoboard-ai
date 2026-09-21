import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Code, CheckSquare, Quote } from 'lucide-react';
import { clsx } from 'clsx';
import type { Scene } from '@videoboard/shared';
import { useEffect } from 'react';

interface Props {
  scene: Scene;
  onUpdate: (data: Partial<Scene>) => void;
}

export function ScriptEditor({ scene, onUpdate }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Escribe el guion de esta escena...' }),
    ],
    content: (scene.script_content as any)?.html || '',
    onUpdate: ({ editor }) => {
      onUpdate({
        script_content: {
          html: editor.getHTML(),
          json: editor.getJSON(),
        },
      });
    },
  });

  // Sync external changes
  useEffect(() => {
    if (editor && (scene.script_content as any)?.html !== editor.getHTML()) {
      editor.commands.setContent((scene.script_content as any)?.html || '');
    }
  }, [scene.script_content, editor]);

  if (!editor) return null;

  const ToolbarButton = ({ onClick, active, children }: any) => (
    <button
      onClick={onClick}
      className={clsx(
        'p-1.5 rounded-lg transition-all',
        active ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover'
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-surface-edge">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-surface-edge mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive('taskList')}
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-surface-edge mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
        >
          <Code className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
        >
          <Quote className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="prose prose-sm prose-invert max-w-none
            prose-p:text-text-secondary prose-p:leading-relaxed
            prose-headings:text-text-primary prose-headings:font-semibold
            prose-code:bg-surface prose-code:text-accent-pink prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs
            prose-blockquote:border-accent-blue prose-blockquote:text-text-muted
            prose-ul:text-text-secondary prose-ol:text-text-secondary
            [&_ul[data-type='taskList']]:list-none [&_ul[data-type='taskList']]:pl-0
            [&_li[data-type='taskItem']]:flex [&_li[data-type='taskItem']]:items-start [&_li[data-type='taskItem']]:gap-2
            [&_li[data-type='taskItem']_label]:mt-0.5
            [&_li[data-type='taskItem']_div]:flex-1
            focus:outline-none
          "
        />
      </div>
    </div>
  );
}
