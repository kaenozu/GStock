---
description: Guidelines for AI Visualization (Neural Monitor)
---
1. **Metric Definition**: Determine what `AnalysisResult` data to visualize.
2. **Visual Choice**:
    - **Gauge**: For 0-100% confidence/probability.
    - **Bar**: For oscillators (RSI, ADX).
    - **Icon**: For binary states (Buy/Sell).
3. **Implementation**:
    - Use SVG for complex shapes.
    - Add animations in `page.module.css` (Pulse, Scan).
4. **Integration**: Update `NeuralMonitor.tsx`.
