---
description: Procedures for safely refactoring components
---
1. **Analyze**: Identify the logical boundaries in the target file.
2. **Create**: Make a new `.tsx` file in `src/components/...`.
3. **Migrate**: Move logic and interfaces. Ensure no circular dependencies.
4. **Integrate**: Import the new component back into the parent.
5. **Verify**: Run the `verify-system` workflow.
