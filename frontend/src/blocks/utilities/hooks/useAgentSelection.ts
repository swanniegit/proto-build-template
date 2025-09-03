/**
 * @file Hook to manage agent selection with dependency resolution.
 * @coder Gemini
 * @category Utility/Controller Hook
 */
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';

// This would be imported from a central types file
interface AgentTemplate {
  id: string;
  name: string;
  depends_on?: string[];
}

const MAX_SELECTED_AGENTS = 5;

export const useAgentSelection = (availableTemplates: AgentTemplate[]) => {
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const templatesById = useMemo(() => 
    availableTemplates.reduce((acc, t) => {
      acc[t.id] = t;
      return acc;
    }, {} as Record<string, AgentTemplate>), 
  [availableTemplates]);

  const getDependenciesRecursive = useCallback((templateId: string, allDeps = new Set<string>()) => {
    const template = templatesById[templateId];
    if (!template || !template.depends_on) return allDeps;

    for (const depId of template.depends_on) {
      if (!allDeps.has(depId)) {
        allDeps.add(depId);
        getDependenciesRecursive(depId, allDeps);
      }
    }
    return allDeps;
  }, [templatesById]);

  const getDependentsRecursive = useCallback((templateId: string, allDeps = new Set<string>()) => {
    for (const template of availableTemplates) {
      if (template.depends_on?.includes(templateId)) {
        if (!allDeps.has(template.id)) {
          allDeps.add(template.id);
          getDependentsRecursive(template.id, allDeps);
        }
      }
    }
    return allDeps;
  }, [availableTemplates]);

  const handleTemplateToggle = useCallback((templateId: string) => {
    setSelectedTemplates(prev => {
      const newSelection = new Set(prev);
      const isSelected = newSelection.has(templateId);

      if (isSelected) {
        // Deselecting
        newSelection.delete(templateId);
        const dependents = getDependentsRecursive(templateId);
        dependents.forEach(depId => newSelection.delete(depId));
      } else {
        // Selecting
        newSelection.add(templateId);
        const dependencies = getDependenciesRecursive(templateId);
        dependencies.forEach(depId => newSelection.add(depId));

        if (newSelection.size > MAX_SELECTED_AGENTS) {
          toast.error(`Cannot select more than ${MAX_SELECTED_AGENTS} agents.`);
          return prev; // Revert to previous state
        }
      }
      return Array.from(newSelection);
    });
  }, [getDependenciesRecursive, getDependentsRecursive]);

  const isSelectable = useCallback((templateId: string): boolean => {
    const template = templatesById[templateId];
    if (!template || !template.depends_on) return true;

    return template.depends_on.every(depId => selectedTemplates.includes(depId));
  }, [selectedTemplates, templatesById]);

  return {
    selectedTemplates,
    setSelectedTemplates, // Allow direct setting for presets
    handleTemplateToggle,
    isSelectable,
  };
};
