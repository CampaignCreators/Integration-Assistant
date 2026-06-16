# Module 06: Blueprint ERD Visualizer

## Overview
The **Blueprint ERD Visualizer** transforms static mapping lists into a dynamic, highly engaging visual architecture model. It serves as the visual highlight of customer scoping presentations.

## Primary Use Cases
- **Architectural Storytelling**: Enables customer relationships representatives to instantly show customers exactly how fields and relational threads flow between systems.
- **Flow Direction Audits**: Provides immediate visual checks on unidirectional vs. bidirectional data lanes to identify any sync loop design errors before building.

## Key Core Features
- **Visual Node Layout**: Groups source SaaS modules on the left, and HubSpot target objects on the right with beautiful glowing containers.
- **Relational Vector Connectors**: Uses custom visual SVG lines dynamically binding associated entities.
- **Frequency Context Badges**: Lines are annotated with sync-frequency icons (lightning bolts for real-time, clock faces for batch processes).
- **Interactive Highlighting**: Clicking or hovering over any active database entity highlights its corresponding connection path and greys out non-active pathways.

## References & Framework Targets
- Managed by the responsive SVG-anchored canvas in `src/components/ERDCanvas.tsx`.
- Uses resizing observers to prevent layout breaking or truncation on wide screens.
