ocr_image_prompt = """Extract structured data from the images and ocr text in the following JSON format:
           "questions": [
               {
                   "question_number": int,
                   "question": "Single-line question text",
                   "options": {
                       "1": "Option 1 in one line",
                       "2": "Option 2 in one line",
                       "3": "Option 3 in one line",
                       "4": "Option 4 in one line"
                   },
                   "im_desp": "If there is an image/diagram for the question, provide its detailed description; otherwise, output NULL"
               }
           ]
       

       
       - Extract exactly questions per requested range of question number.
       - Extract options and questions, never return null for question or options.
       - If options are images, describe them textually.
       - Ensure no duplicate or missing questions.
       - format : json(all questions together as a single json)
       - options are srictly 1,2,3,4. if options in a,b,c,d chenage them to 1,2,3,4 RESPECTIVELY.
       - Do Not reorder the options wrt their option numbers.
       - For equations and formulaes make them acurate in Plain Text Math Notation.
       - Keep Greek letters (like μ) as-is
       - Use explicit multiplication: a * b * c
       - Fractions: (numerator) / (denominator)
       - Square roots: sqrt(expression)
       - Powers: x^n
       - Group with parentheses where needed
       - Never return Null for any option.
       - Make sure option values are acurate.
    """





ocr_prompt = """Extract structured data from the data given in the following JSON format:
           "questions": [
               {
                   "question_number": int,
                   "question": "Single-line question text",
                   "options": {
                       "1": "Option 1 in one line",
                       "2": "Option 2 in one line",
                       "3": "Option 3 in one line",
                       "4": "Option 4 in one line"
                   },
                   "im_desp": "If there is an image/diagram for the question, provide its detailed description; otherwise, output NULL"
               }
           ]
       

       
       - Extract exactly questions per requested range of question number.
       - Extract options and questions, never return null for question or options.
       - If options are images, describe them textually.
       - In 'match the column' questions, provide columns correctly in im_desp.
       - Ensure no duplicate or missing questions.
       - format : json(all questions together as a single json)
       - options are srictly 1,2,3,4. if options in a,b,c,d chenage them to 1,2,3,4 RESPECTIVELY.
       - Do Not reorder the options wrt their option numbers.
       - Never return Null for any option, becuase they never can be.
       - Make sure option values are acurate.
    """

image_ocr_prompt = """Extract structured data from the images in the following JSON format:
           "questions": [
               {
                   "question_number": int,
                   "question": "Single-line question text",
                   "options": {
                       "1": "Option 1 in one line",
                       "2": "Option 2 in one line",
                       "3": "Option 3 in one line",
                       "4": "Option 4 in one line"
                   },
                   "im_desp": "If there is an image/diagram for the question, provide its detailed description; otherwise, output NULL"
               }
           ]
       

       
       - Extract exactly questions per requested range of question number.
       - Extract options and questions, never return null for question or options.
       - If options are images, describe them textually.
       - In 'match the column' questions, provide columns correctly in im_desp.
       - Ensure no duplicate or missing questions.
       - format : json(all questions together as a single json)
       - options are srictly 1,2,3,4. if options in a,b,c,d chenage them to 1,2,3,4 RESPECTIVELY.
       - Do Not reorder the options wrt their option numbers.
       - For equations and formulaes make them acurate in Plain Text Math Notation.
       - Keep Greek letters (like μ) as-is
       - Use explicit multiplication: a * b * c
       - Fractions: (numerator) / (denominator)
       - Square roots: sqrt(expression)
       - Powers: x^n
       - Group with parentheses where needed
       - Never return Null for any option.
       - Make sure option values are acurate.
    """



swot_prompts = {
    "TS_BPT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Carefully analyze the student’s data to generate insights related to the specific metric.  
- Prioritize clarity, simplicity, and a motivational tone—these insights are for the student to read and act on.  
- Mention only the student's strengths. Tell like you are good at this...  
- Connect the insights directly to the data (topics, scores, question types, feedback).  
- Rank all possible insights based on impact and select only the **top two**.  
- Each insight must be exactly **two concise sentences**: direct, specific, and actionable.  
- Avoid complex academic language or technical jargon.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "TS_IOT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Analyze the student’s performance trends across weeks or tests to find areas with visible improvement.  
- Highlight specific topics or periods where growth is evident.  
- Use the word “potential” where it fits to describe progress.  
- Rank insights by their impact on overall performance.  
- Keep language student-friendly and actionable.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output: 
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "TS_SQT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Identify question types where the student performs best.  
- Focus on patterns of success and underlying factors like clarity or strategy.  
- Use the word “potential” where suitable.  
- Rank insights based on performance impact.  
- Keep feedback concise, supportive, and practical.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "TW_MCT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Analyze the data to find topics where the student struggles the most.  
- Explain the challenge and suggest simple ways to improve.  
- Use “potential” if the topic shows scope for turnaround.  
- Rank insights by urgency and impact.  
- Keep tone constructive and clear.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "TW_WOT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Look for patterns of performance decline or stagnation over time.  
- Focus on specific topics or periods with slipping scores.  
- Suggest actions to recover lost ground.  
- Use “potential” to encourage correction and growth.  
- Rank by impact on exam readiness.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "TW_LRT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Detect topics where the student forgets concepts or makes repeated errors.  
- Explain how this affects performance and recommend a simple solution.  
- Highlight potential for improvement with better revision methods.  
- Rank insights by their performance impact.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "TO_PR":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Identify areas that are close to improving with more focused practice.  
- Suggest actionable, topic-specific practice strategies.  
- Use “potential” to highlight the upside of extra effort.  
- Rank insights by score improvement potential.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "TO_MO":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Find areas where the student underperformed despite having the potential to score higher.  
- Recommend quick adjustments or missed tactics.  
- Rank by impact and ease of improvement.  
- Keep tone encouraging and focused on future gain.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "TO_RLT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Identify topics that were mastered quickly with minimal effort.  
- Highlight their potential for quick score boosts with continued focus.  
- Suggest next steps to fully capitalize on this learning speed.  
- Rank insights based on immediate performance gain.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output: 
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "TT_RMCG":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Find repeated errors or misunderstandings in specific areas.  
- Explain the risk and suggest a clear correction approach.  
- Use “potential” to indicate that closing this gap will raise performance.  
- Rank by recurrence and impact.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.



Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "TT_WHIT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Detect weak areas in critical NEET topics where strong scores are essential.  
- Describe the risk and suggest a focused fix.  
- Highlight potential score loss if not corrected.  
- Rank by exam weight and impact.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "TT_IP":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Find areas where the student’s scores vary significantly.  
- Suggest methods to build consistency and reduce fluctuation.  
- Use “potential” if stabilizing this area can unlock more marks.  
- Rank by variability and performance impact.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.'''
}


swot_test_prompts = {
    "SS_BPT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Carefully analyze the student’s data to generate insights related to the specific metric.  
- Prioritize clarity, simplicity, and motivational tone—these insights are for the student to read and act on.  
- Use the word “potential” if it helps convey improvement or strength.  
- Do not generalize—connect the insights to what the data shows (topics, scores, question types, feedback).  
- Rank all possible insights based on impact and select only the **top two**.  
- Each insight must be exactly **two concise sentences**: direct, specific, and actionable.  
- Avoid complex academic language or technical jargon. Be clear, supportive, and student-friendly.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "SS_IOT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Analyze the student’s performance trends across weeks or tests to find areas with visible improvement.  
- Highlight specific topics or periods where growth is evident.  
- Use the word “potential” where it fits to describe progress.  
- Rank insights by their impact on overall performance.  
- Keep language student-friendly and actionable.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output: 
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "SS_SQT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Identify question types where the student performs best.  
- Focus on patterns of success and underlying factors like clarity or strategy.  
- Use the word “potential” where suitable.  
- Rank insights based on performance impact.  
- Keep feedback concise, supportive, and practical.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "SW_MCT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Analyze the data to find topics where the student struggles the most.  
- Explain the challenge and suggest simple ways to improve.  
- Use “potential” if the topic shows scope for turnaround.  
- Rank insights by urgency and impact.  
- Keep tone constructive and clear.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "SW_WOT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Look for patterns of performance decline or stagnation over time.  
- Focus on specific topics or periods with slipping scores.  
- Suggest actions to recover lost ground.  
- Use “potential” to encourage correction and growth.  
- Rank by impact on exam readiness.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "SW_LRT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Detect topics where the student forgets concepts or makes repeated errors.  
- Explain how this affects performance and recommend a simple solution.  
- Highlight potential for improvement with better revision methods.  
- Rank insights by their performance impact.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "SO_PR":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Identify areas that are close to improving with more focused practice.  
- Suggest actionable, topic-specific practice strategies.  
- Use “potential” to highlight the upside of extra effort.  
- Rank insights by score improvement potential.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.


Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "SO_MO":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.
Instructions:  
- Find areas where the student underperformed despite having the potential to score higher.  
- Recommend quick adjustments or missed tactics.  
- Rank by impact and ease of improvement.  
- Keep tone encouraging and focused on future gain.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "SO_RLT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Identify topics that were mastered quickly with minimal effort.  
- Highlight their potential for quick score boosts with continued focus.  
- Suggest next steps to fully capitalize on this learning speed.  
- Rank insights based on immediate performance gain.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output: 
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "ST_RMCG":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Find repeated errors or misunderstandings in specific areas.  
- Explain the risk and suggest a clear correction approach.  
- Use “potential” to indicate that closing this gap will raise performance.  
- Rank by recurrence and impact.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "ST_WHIT":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Detect weak areas in critical NEET topics where strong scores are essential.  
- Describe the risk and suggest a focused fix.  
- Highlight potential score loss if not corrected.  
- Rank by exam weight and impact.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.''',
    "ST_IP":'''Context:  
You are an AI mentor helping a NEET student understand their performance based on test data. This includes subject-wise topics, individual questions, and feedback gathered during their assessments. Your goal is to provide the two most impactful insights for this metric.

Instructions:  
- Find areas where the student’s scores vary significantly.  
- Suggest methods to build consistency and reduce fluctuation.  
- Use “potential” if stabilizing this area can unlock more marks.  
- Rank by variability and performance impact.
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

Output:  
Return exactly two bullet-point insights. Each should reflect a ranked, high-impact takeaway from the data with a brief explanation or recommendation.'''
}


performance_prompt = """
You are a NEET Examiner and Diagnostic Analyst. Your role is to evaluate student performance data and generate structured SWOT-based insights.

Task:
Analyze the provided data and generate diagnostic insights in a nested JSON format.

Output Format (Strict JSON Structure):

{
  "Chapter Name": {
    "Chapter Insights": [
      "Strength: <value>",
      "Weakness: <value>",
      "Opportunity: <value>"
    ],
    "Topic Insights": {
      "Topic Name": [
        "Strength: <value>",
        "Weakness: <value>",
        "Opportunity: <value>"
      ]
    }
  }
}

Rules:
- Only output the JSON.
- Each chapter and topic must have exactly 3 one-line insights.
- Be sure to follow the structure.
- Never return null for any value.
- Make sure you generate for all the chapters(A-Z).
- It is crucial that you Use highly simple, very easy-to-understand Indian-English.
- Respond only in English. Do NOT use Hindi, Hinglish, or Romanized Hindi.

"""

overview_prompts = {
        "KS": """**Insight Type**: Key Strengths

**Input**: Top 5 high-performing chapters per subject with correctly answered questions and their metadata (type, feedback, misconception, etc.)

**Instruction**: Analyze the data holistically across all subjects.- It is crucial that you Use highly simple, very easy-to-understand English.  Identify key strengths based on accuracy, conceptual clarity, and question type patterns. Prioritize insights that reflect valuable academic traits(max 10 words each line). Use simple, easy-to-understand English.

**Output**: Return exactly 3 short insights summarizing the student’s strongest learning attributes across subjects.

**Tone**: Clear, motivational, and insight-rich. Keep each line concise and meaningful.
""",
        "AI": """**Insight Type**: Areas of Improvement

**Input**: Mid-performing chapters per subject with correctly answered questions and their metadata (type, feedback, misconception, etc.)

**Instruction**: Analyze the data across all subjects to identify chapters where the student is showing improvement. Focus on chapters with moderate performance where correct answers indicate growing understanding, effort, or reduced misconceptions(max 10 words each line). Use simple, easy-to-understand English.

**Output**: Return exactly 3 short and specific insight lines. Each insight should reflect where the student is improving and can accelerate further with focus.

**Tone**: Constructive, forward-looking, and precise.
""",
        "QR": """**Insight Type**: Quick Recommendations

**Input**: Mid-performing chapters per subject with correctly answered questions and their metadata (type, feedback, misconception, etc.)

**Instruction**: Be Highly motivational. Identify chapters where the student has partial mastery and is most likely to benefit from focused revision. Prioritize chapters where accuracy is moderate, and responses show learning momentum(max 10 words each line). Use simple, easy-to-understand English.

**Output**: List 3 chapters as insight line wherein it should be a direct study recommendations. Choose chapters with clear scope for rapid improvement.

**Tone**: Direct, actionable, and concise.
""",
        "CV": """**Insight Type**: Consistency & Vulnerability

**Input**: Chapter-wise accuracy across tests and question-level issues (misconceptions, feedback)

**Instruction**: Identify areas where student performance varies significantly. Highlight chapters where accuracy fluctuates or conceptual gaps are evident(max 10 words each line). Use simple, easy-to-understand English.

**Output**: Give 3 insights on student consistency, weakness patterns, or unstable performance areas.

**Tone**: Analytical and supportive.
"""
    }

# Action Plan Prompt
action_plan_prompt = """
**Task**: Generate a personalized action plan for a NEET student to improve performance across ALL weak topics.

**Context**: You are an AI mentor helping students prioritize their learning efforts by identifying the most impactful action items.

**Input Data Provided**:
- Multiple weak topics with performance metrics (accuracy, weighted accuracy, improvement rate)
- Wrong questions from each topic including:
  - Question text, options, selected answer, correct answer
  - Misconception type and description
  - Feedback for the incorrect answer
  - Question type

**Your Task**:
1. Analyze ALL weak topics provided
2. For each topic, identify potential action items based on:
   - Root causes of mistakes
   - Conceptual gaps and misconceptions
   - Error patterns across questions
   - Impact on overall performance
3. Generate a comprehensive list of possible action items across all topics
4. Rank ALL action items by:
   - **Impact**: How much this will improve student's overall performance
   - **Actionability**: How clear and achievable the action is
5. Select ONLY the **top 5 most impactful and actionable items** from across all topics

**Action Item Requirements**:
- Each action must be **10–15 words** maximum
- Must be specific, clear, and directly tied to their mistakes
- Must be actionable and student-friendly
- Use simple, easy-to-understand Indian-English
- Avoid complex academic language or technical jargon
- Be motivational yet honest about areas needing work
- Each action should reference the specific topic/subject it relates to

**Output Format (strict JSON)**:
[
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.45,
    "action": "Single actionable insight (10–15 words)"
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.32,
    "action": "Single actionable insight (10–15 words)"
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.58,
    "action": "Single actionable insight (10–15 words)"
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.41,
    "action": "Single actionable insight (10–15 words)"
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.29,
    "action": "Single actionable insight (10–15 words)"
  }
]

**Guidelines**:
- Return EXACTLY 5 action items total (not per topic)
- These 5 should be the highest-impact actions across ALL topics
- Actions should directly reflect the student's actual wrong answers
- Focus on learning improvements, not just "practice more"
- Keep tone supportive and constructive
- No generic advice—make it specific to the data
- Multiple actions can be from the same topic if they're high-impact

**Important**:
- Return ONLY the JSON array of exactly 5 items
- No explanations, no notes, no markdown code blocks
- Strictly follow the format above

"""

# Checklist Prompt
checklist_prompt = """
**Task**: Generate a diagnostic checklist identifying student's problems and mistakes across all weak topics in a test.

**Context**: You are an AI diagnostic tool helping students understand WHAT went wrong in their performance—not HOW to fix it. This checklist is about identifying mistakes, misconceptions, and problem patterns.

**Input Data Provided**:
- Multiple weak topics from a specific test with performance metrics
- Wrong questions from each topic including:
  - Question text, options, selected answer, correct answer
  - Misconception type and description
  - Feedback for the incorrect answer
  - Question type

**Your Task**:
1. Analyze ALL weak topics and wrong answers provided
2. Identify specific problems, mistakes, and misconceptions across all topics:
   - What conceptual errors were made
   - What calculation/procedural mistakes occurred
   - What patterns of confusion are evident
   - What fundamental gaps exist
3. Generate a comprehensive list of diagnostic checkpoints
4. Rank ALL checkpoints by:
   - **Severity**: How much this mistake impacts overall performance
   - **Frequency**: How often this mistake appears across questions
5. Select ONLY the **top 6 most critical problem checkpoints** from across all topics

**Checkpoint Requirements**:
- Each checkpoint must be **10–15 words** maximum
- Must clearly identify WHAT went wrong (not how to fix it)
- Must be diagnostic and factual, not prescriptive
- Use simple, easy-to-understand Indian-English
- Avoid solution-oriented language (no "should do", "need to practice")
- Be direct and clear about the mistake or gap
- Each checkpoint should reference the specific topic/subject where the problem occurred

**Output Format (strict JSON)**:
[
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.45,
    "problem": "Specific mistake or misconception identified (10–15 words)"
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.32,
    "problem": "Specific mistake or misconception identified (10–15 words)"
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.58,
    "problem": "Specific mistake or misconception identified (10–15 words)"
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.41,
    "problem": "Specific mistake or misconception identified (10–15 words)"
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.29,
    "problem": "Specific mistake or misconception identified (10–15 words)"
  },
  {
    "topic": "Topic name",
    "subject": "Subject name",
    "accuracy": 0.36,
    "problem": "Specific mistake or misconception identified (10–15 words)"
  }
]

**Guidelines**:
- Return EXACTLY 6 problem checkpoints total (not per topic)
- These 6 should be the most critical issues across ALL topics
- Checkpoints should directly reflect the student's actual wrong answers
- Focus on identifying the mistake, not fixing it
- Use diagnostic language: "confused", "mistook", "missed", "incorrectly applied"
- No prescriptive advice—this is a problem identification list
- Multiple checkpoints can be from the same topic if critical

**Important**:
- Return ONLY the JSON array of exactly 6 items
- No explanations, no notes, no markdown code blocks
- Strictly follow the format above

"""

# Study Tips Prompt
study_tips_prompt = """
**Task**: Generate practical, personalized study techniques and habits to help a NEET student study smarter based on their performance patterns.

**Context**: You are an AI study coach providing short, actionable learning strategies. These tips should focus on HOW to study better—methods, habits, and techniques tailored to the student's strengths, weaknesses, and learning patterns.

**Input Data Provided**:
- **Strong Topics** (accuracy >= 85%): Topics where the student excels
- **Weak Topics** (accuracy < 60%): Topics where the student struggles
- **Moderate Topics** (60-85% accuracy): Topics with room for improvement
- **Question Type Analysis**: Performance breakdown by question type (correct/incorrect counts)

Each topic includes:
- Subject name
- Topic name
- Accuracy percentage
- Weighted accuracy score

**Your Task**:
1. Analyze the student's overall performance pattern:
   - Identify what types of questions they handle well vs. struggle with
   - Notice patterns in their strong vs. weak areas
   - Consider their question-type performance
2. Generate practical study techniques that:
   - Leverage their strengths to build confidence
   - Address their weaknesses with targeted methods
   - Optimize their learning approach based on patterns
   - Are specific to NEET exam preparation
3. Rank all possible study tips by:
   - **Practicality**: How easily the student can implement this
   - **Impact**: How much this will improve their overall study effectiveness
4. Select ONLY the **top 5 most practical and impactful study techniques**

**Study Tip Requirements**:
- Each tip must be **12–18 words** maximum
- Must be practical and immediately actionable
- Focus on study methods and habits, NOT specific content to learn
- Use simple, easy-to-understand Indian-English
- Be specific to their performance patterns
- Motivational yet realistic
- Examples: time management, revision techniques, practice strategies, learning methods

**Output Format (strict JSON)**:
[
  {
    "category": "Time Management" | "Revision Strategy" | "Practice Method" | "Learning Technique" | "Mistake Analysis",
    "tip": "Practical study technique or habit (12–18 words)",
    "relevance": "Brief note on why this applies to the student (8–12 words)"
  },
  {
    "category": "Time Management" | "Revision Strategy" | "Practice Method" | "Learning Technique" | "Mistake Analysis",
    "tip": "Practical study technique or habit (12–18 words)",
    "relevance": "Brief note on why this applies to the student (8–12 words)"
  },
  {
    "category": "Time Management" | "Revision Strategy" | "Practice Method" | "Learning Technique" | "Mistake Analysis",
    "tip": "Practical study technique or habit (12–18 words)",
    "relevance": "Brief note on why this applies to the student (8–12 words)"
  },
  {
    "category": "Time Management" | "Revision Strategy" | "Practice Method" | "Learning Technique" | "Mistake Analysis",
    "tip": "Practical study technique or habit (12–18 words)",
    "relevance": "Brief note on why this applies to the student (8–12 words)"
  },
  {
    "category": "Time Management" | "Revision Strategy" | "Practice Method" | "Learning Technique" | "Mistake Analysis",
    "tip": "Practical study technique or habit (12–18 words)",
    "relevance": "Brief note on why this applies to the student (8–12 words)"
  }
]

**Guidelines**:
- Return EXACTLY 5 study tips total
- These should be the highest-impact techniques for THIS student
- Tips should reflect their actual performance patterns
- Focus on studying smarter, not just harder
- Avoid generic advice—make it specific to their data
- Each tip should have a clear category
- Keep tone supportive and encouraging

**Important**:
- Return ONLY the JSON array of exactly 5 items
- No explanations, no notes, no markdown code blocks
- Strictly follow the format above

"""
