/*
 * resolution.ts
 *
 * Function and variable resolution for IntelliCode.
 */

import { Scope } from './scope';
import { Assignment } from './types';

export function resolveFunction(rightHandSide: string, functionName: string): string {
    return rightHandSide && rightHandSide.length > 0 ? `${functionName}.${rightHandSide}` : functionName;
}

// Resolve variable from a scope upwards until reaches root
export function resolveVariable(scope: Scope, variableName: string, beforeIndex: number): string | undefined {
    if (!variableName || !scope || (!scope.parent && (!scope.assignments || scope.assignments.length === 0))) {
        return variableName;
    }
    let currentScope = scope;
    const assignments = currentScope.assignments;
    let result = resolveAssignments(assignments, variableName, beforeIndex);
    while (!result && currentScope.parent) {
        currentScope = currentScope.parent;
        result = resolveAssignments(currentScope.assignments, variableName, beforeIndex);
    }
    return result;
}

// Evaluate previous assignments to resolve defined variable types
export function resolveAssignments(
    assignments: Assignment[] | undefined,
    variableName: string,
    beforeIndex: number
): string | undefined {
    if (!assignments) {
        return undefined;
    }
    // Resolve from back to front, variable type is always the latest defined
    let resolvedName: string | undefined;
    for (let i = assignments.length - 1; i >= 0; i--) {
        const prevAssignment = assignments[i];
        if (prevAssignment.spanStart > beforeIndex) {
            continue;
        }

        if (prevAssignment.key === variableName && !resolvedName) {
            resolvedName = prevAssignment.value;
        } else if (resolvedName === prevAssignment.key) {
            resolvedName = prevAssignment.value;
        }
    }
    return resolvedName;
}
