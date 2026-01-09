# Checkpoint Prompt Analysis & Comparison

## Key Differences Between Action Plan and Checklist

### Action Plan Prompt (5 items)
**Purpose**: HOW to fix problems (prescriptive)

**Tone & Language**:
- Motivational yet honest
- Supportive and constructive
- Action-oriented: "practice", "revise", "focus on", "review"
- Student-friendly and encouraging

**Ranking Criteria**:
- **Impact**: How much this will improve student's overall performance
- **Actionability**: How clear and achievable the action is

**Key Constraints**:
- Must be actionable and student-friendly
- Focus on learning improvements, not just "practice more"
- No generic advice—make it specific to the data
- Must reference specific topic/subject
- Should directly reflect actual wrong answers

**Forbidden**:
- Generic advice
- Just saying "practice more" without specificity

---

### Checklist Prompt (6 items)
**Purpose**: WHAT went wrong (diagnostic)

**Tone & Language**:
- Direct and clear
- Diagnostic and factual
- Problem-identification: "confused", "mistook", "missed", "incorrectly applied"
- Objective, not judgmental

**Ranking Criteria**:
- **Severity**: How much this mistake impacts overall performance
- **Frequency**: How often this mistake appears across questions

**Key Constraints**:
- Must clearly identify WHAT went wrong (not how to fix it)
- Must be diagnostic and factual, not prescriptive
- Be direct and clear about the mistake or gap
- Must reference specific topic/subject where problem occurred
- Should directly reflect actual wrong answers

**Forbidden**:
- Solution-oriented language
- No "should do", "need to practice"
- No prescriptive advice

---

## Combined Checkpoint Prompt Coverage

### ✅ What Was Incorporated

#### From Checklist Prompt:
1. ✅ Diagnostic and factual nature
2. ✅ "WHAT went wrong" focus
3. ✅ Diagnostic language: "confused", "mistook", "missed", "incorrectly applied"
4. ✅ Avoid solution-oriented language in checkpoint
5. ✅ Be direct and clear about mistakes
6. ✅ Ranking by Severity + Frequency
7. ✅ Must reference specific topic/subject
8. ✅ Identify conceptual errors, calculation mistakes, patterns of confusion, fundamental gaps
9. ✅ Directly reflect actual wrong answers
10. ✅ 10-15 word limit

#### From Action Plan Prompt:
1. ✅ "HOW to fix" focus
2. ✅ Prescriptive and actionable nature
3. ✅ Action language: "practice", "revise", "focus on", "review"
4. ✅ Motivational yet honest tone
5. ✅ Supportive and constructive approach
6. ✅ Ranking by Impact + Actionability
7. ✅ Must be actionable and student-friendly
8. ✅ Focus on learning improvements, not just "practice more"
9. ✅ No generic advice—specific to data
10. ✅ Must reference specific topic/subject
11. ✅ Root causes of mistakes, error patterns
12. ✅ 10-15 word limit

#### Additional Combined Logic:
1. ✅ 1:1 pairing - checkpoint #1 problem addressed by action #1
2. ✅ Integrated ranking (Severity + Frequency + Impact + Actionability)
3. ✅ 5 paired items (compromise between 5 action + 6 checklist)
4. ✅ Both checkpoint and action in same JSON object
5. ✅ Clear separation of diagnostic vs prescriptive language
6. ✅ Unified simple Indian-English constraint
7. ✅ 10-year-old reading level constraint

---

## Logical Flow Comparison

### Original Separate Flow:
```
Checklist (6 items)          Action Plan (5 items)
     ↓                              ↓
Problem 1 ────────────?─────→ Action A (may or may not relate)
Problem 2 ────────────?─────→ Action B (may or may not relate)
Problem 3 ────────────?─────→ Action C (no guaranteed connection)
Problem 4 ────────────?─────→ Action D (separate LLM call)
Problem 5 ────────────?─────→ Action E (different context)
Problem 6 (no matching action)

❌ No guaranteed alignment
❌ Two separate LLM calls
❌ Different context windows
```

### New Combined Flow:
```
Combined Checkpoints (5 items)
          ↓
[Problem 1] ─────────1:1─────→ [Action 1] (directly addresses Problem 1)
[Problem 2] ─────────1:1─────→ [Action 2] (directly addresses Problem 2)
[Problem 3] ─────────1:1─────→ [Action 3] (directly addresses Problem 3)
[Problem 4] ─────────1:1─────→ [Action 4] (directly addresses Problem 4)
[Problem 5] ─────────1:1─────→ [Action 5] (directly addresses Problem 5)

✅ Guaranteed 1:1 alignment
✅ Single LLM call
✅ Unified context window
✅ Paired reasoning
```

---

## Comprehensive Constraint Matrix

| Constraint | Checklist | Action Plan | Combined Checkpoint |
|------------|-----------|-------------|---------------------|
| Word limit | 10-15 | 10-15 | 10-15 (both) |
| Count | 6 items | 5 items | 5 paired items |
| Language level | 10-year-old | 10-year-old | 10-year-old |
| Indian-English | ✅ | ✅ | ✅ |
| Diagnostic language | ✅ | ❌ | ✅ (checkpoint) |
| Prescriptive language | ❌ | ✅ | ✅ (action) |
| Reference topic/subject | ✅ | ✅ | ✅ (both) |
| Reflect actual answers | ✅ | ✅ | ✅ (both) |
| No generic advice | - | ✅ | ✅ (action) |
| Motivational tone | - | ✅ | ✅ (action) |
| Avoid "should do" | ✅ | - | ✅ (checkpoint) |
| Focus on learning | - | ✅ | ✅ (action) |
| Rank by Severity | ✅ | - | ✅ |
| Rank by Frequency | ✅ | - | ✅ |
| Rank by Impact | - | ✅ | ✅ |
| Rank by Actionability | - | ✅ | ✅ |

---

## Quality Improvements in Combined Prompt

1. **More Comprehensive Analysis**
   - Combines all ranking criteria from both prompts
   - Looks at: Severity, Frequency, Impact, AND Actionability

2. **Better Instructions**
   - Explicitly lists all types of mistakes to identify (from checklist)
   - Explicitly lists all solution requirements (from action plan)
   - Clear separation between checkpoint and action requirements

3. **Stronger Constraints**
   - Inherits "no generic advice" from action plan
   - Inherits "no prescriptive language" constraint for checkpoints
   - Maintains both diagnostic and motivational tones appropriately

4. **Better Alignment**
   - Forces LLM to think about problem-solution pairs together
   - Ensures each action directly addresses its paired checkpoint
   - Reduces chance of mismatched insights

---

## Example Output Comparison

### Old Separate Approach:
**Checklist #2**: "Confused between series and parallel circuit formulas"
**Action Plan #2**: "Practice balancing chemical equations daily" ❌ (Not related!)

### New Combined Approach:
**Checkpoint #2**: "Confused between series and parallel circuit formulas"
**Action #2**: "Review series and parallel circuit formulas with practice diagrams" ✅ (Directly related!)

---

## Summary

The combined checkpoint prompt successfully:
1. ✅ Captures ALL constraints from both original prompts
2. ✅ Maintains the distinct diagnostic vs prescriptive tones
3. ✅ Preserves word limits, language level, and formatting requirements
4. ✅ Adds 1:1 pairing logic for better coherence
5. ✅ Uses unified ranking criteria combining all factors
6. ✅ Reduces from 6+5=11 separate items to 5 paired items (more focused)
7. ✅ Improves user experience with directly connected problem-solution pairs
