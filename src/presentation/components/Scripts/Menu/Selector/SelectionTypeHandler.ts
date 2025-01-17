import { IScript } from '@/domain/IScript';
import { RecommendationLevel } from '@/domain/RecommendationLevel';
import { scrambledEqual } from '@/application/Common/Array';
import { ICategoryCollection } from '@/domain/ICategoryCollection';
import { ReadonlyScriptSelection, ScriptSelection } from '@/application/Context/State/Selection/Script/ScriptSelection';
import { SelectedScript } from '@/application/Context/State/Selection/Script/SelectedScript';

export enum SelectionType {
  Standard,
  Strict,
  All,
  None,
  Custom,
}

export function setCurrentSelectionType(type: SelectionType, context: SelectionMutationContext) {
  if (type === SelectionType.Custom) {
    throw new Error('Cannot select custom type.');
  }
  const selector = selectors.get(type);
  if (!selector) {
    throw new Error(`Cannot handle the type: ${SelectionType[type]}`);
  }
  selector.select(context);
}

export function getCurrentSelectionType(context: SelectionCheckContext): SelectionType {
  for (const [type, selector] of selectors.entries()) {
    if (selector.isSelected(context)) {
      return type;
    }
  }
  return SelectionType.Custom;
}

export interface SelectionCheckContext {
  readonly selection: ReadonlyScriptSelection;
  readonly collection: ICategoryCollection;
}

export interface SelectionMutationContext {
  readonly selection: ScriptSelection,
  readonly collection: ICategoryCollection,
}

interface SelectionTypeHandler {
  isSelected: (context: SelectionCheckContext) => boolean;
  select: (context: SelectionMutationContext) => void;
}

const selectors = new Map<SelectionType, SelectionTypeHandler>([
  [SelectionType.None, {
    select: ({ selection }) => selection.deselectAll(),
    isSelected: ({ selection }) => selection.selectedScripts.length === 0,
  }],
  [SelectionType.Standard, getRecommendationLevelSelector(RecommendationLevel.Standard)],
  [SelectionType.Strict, getRecommendationLevelSelector(RecommendationLevel.Strict)],
  [SelectionType.All, {
    select: ({ selection }) => selection.selectAll(),
    isSelected: (
      { selection, collection },
    ) => selection.selectedScripts.length === collection.totalScripts,
  }],
]);

function getRecommendationLevelSelector(
  level: RecommendationLevel,
): SelectionTypeHandler {
  return {
    select: (context) => selectOnly(level, context),
    isSelected: (context) => hasAllSelectedLevelOf(level, context),
  };
}

function hasAllSelectedLevelOf(
  level: RecommendationLevel,
  context: SelectionCheckContext,
): boolean {
  const { collection, selection } = context;
  const scripts = collection.getScriptsByLevel(level);
  const { selectedScripts } = selection;
  return areAllSelected(scripts, selectedScripts);
}

function selectOnly(
  level: RecommendationLevel,
  context: SelectionMutationContext,
): void {
  const { collection, selection } = context;
  const scripts = collection.getScriptsByLevel(level);
  selection.selectOnly(scripts);
}

function areAllSelected(
  expectedScripts: ReadonlyArray<IScript>,
  selection: ReadonlyArray<SelectedScript>,
): boolean {
  const selectedScriptIds = selection
    .filter((selected) => !selected.revert)
    .map((script) => script.id);
  if (expectedScripts.length < selectedScriptIds.length) {
    return false;
  }
  const expectedScriptIds = expectedScripts.map((script) => script.id);
  return scrambledEqual(selectedScriptIds, expectedScriptIds);
}
