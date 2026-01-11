"use client";

import { FileEdit, FilePlus, Eye, Trash2, FolderEdit } from "lucide-react";

interface ToolActionLabelProps {
  toolName: string;
  args?: string | Record<string, any>;
}

export function ToolActionLabel({ toolName, args }: ToolActionLabelProps) {
  // Parse args to get command details
  // Args can be either a JSON string or an object (depending on the SDK version)
  let parsedArgs: any = {};
  try {
    if (typeof args === "string" && args) {
      parsedArgs = JSON.parse(args);
    } else if (typeof args === "object" && args) {
      parsedArgs = args;
    }
  } catch (e) {
    // If parsing fails, use empty object
    parsedArgs = {};
  }

  const getActionMessage = (): { icon: React.ReactNode; text: string } => {
    const fileName = parsedArgs.path?.split("/").pop() || "";
    const command = parsedArgs.command;

    if (toolName === "str_replace_editor") {
      switch (command) {
        case "create":
          return {
            icon: <FilePlus className="w-3 h-3 text-green-600" />,
            text: fileName ? `Creating ${fileName}` : `Creating file`,
          };
        case "str_replace":
          return {
            icon: <FileEdit className="w-3 h-3 text-blue-600" />,
            text: fileName ? `Editing ${fileName}` : `Editing file`,
          };
        case "insert":
          return {
            icon: <FileEdit className="w-3 h-3 text-blue-600" />,
            text: fileName ? `Inserting into ${fileName}` : `Inserting into file`,
          };
        case "view":
          return {
            icon: <Eye className="w-3 h-3 text-purple-600" />,
            text: fileName ? `Viewing ${fileName}` : `Viewing file`,
          };
        default:
          return {
            icon: <FileEdit className="w-3 h-3 text-neutral-600" />,
            text: fileName ? `Editing ${fileName}` : `Editing file`,
          };
      }
    }

    if (toolName === "file_manager") {
      const oldPath = parsedArgs.old_path || parsedArgs.path;
      const oldFileName = oldPath?.split("/").pop() || "";

      switch (command) {
        case "delete":
          return {
            icon: <Trash2 className="w-3 h-3 text-red-600" />,
            text: `Deleting ${oldFileName}`,
          };
        case "rename":
          const newFileName = parsedArgs.new_path?.split("/").pop() || "";
          return {
            icon: <FolderEdit className="w-3 h-3 text-orange-600" />,
            text: `Renaming ${oldFileName} to ${newFileName}`,
          };
        default:
          return {
            icon: <FolderEdit className="w-3 h-3 text-neutral-600" />,
            text: oldFileName ? `Managing ${oldFileName}` : `Managing files`,
          };
      }
    }

    // Fallback for unknown tools
    return {
      icon: <FileEdit className="w-3 h-3 text-neutral-600" />,
      text: toolName,
    };
  };

  const { icon, text } = getActionMessage();

  return (
    <div className="inline-flex items-center gap-2">
      {icon}
      <span className="text-neutral-700">{text}</span>
    </div>
  );
}
