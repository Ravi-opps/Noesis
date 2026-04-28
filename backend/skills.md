## Execution Control (Critical)

### Single-Pass Rule
- Once a valid answer is produced:
  - DO NOT re-run the task
  - DO NOT refine the answer automatically
  - DO NOT trigger another model call

### Redundant Output Prevention
- If the expected output is already achieved:
  - Return the result immediately
  - Do NOT attempt improvements unless explicitly requested

### Autopilot Constraint
- Autopilot MUST NOT:
  - Perform a second pass for the same query
  - Re-evaluate completed outputs
  - Trigger premium for “refinement”

### When a Second Pass IS Allowed
ONLY if:
- The user explicitly says:
  - "improve this"
  - "optimize this"
  - "explain deeper"
  - "refactor this"

Otherwise:
→ STOP after first correct response

## Autonomous Execution Control (Hard Stop)

- After completing a response:
  - DO NOT continue autonomously
  - DO NOT generate follow-up actions
  - DO NOT trigger additional model calls

- Treat task as COMPLETE after first valid output

- Any further action requires explicit user input

## Premium Trigger Guard

- A second model call MUST NOT be made unless:
  - The user explicitly asks for more
  - OR the first response failed


  # Skills

## Programming
- Proficient in C++ with strong understanding of STL and problem-solving patterns  
- Comfortable with Python for scripting, data handling, and building small applications  
- Ability to write clean, modular, and maintainable code  

## Data Structures & Algorithms
- Strong grasp of core data structures (arrays, linked lists, stacks, queues, trees, graphs)  
- Familiar with algorithmic paradigms (recursion, dynamic programming, greedy, backtracking)  
- Focus on optimizing time and space complexity  
- Regular practice of problem-solving for interview-level questions  

## Machine Learning & AI (Learning Phase)
- Understanding of fundamental ML concepts (supervised vs unsupervised learning)  
- Familiar with model workflows: data → preprocessing → training → evaluation  
- Exploring real-world applications of AI and predictive systems  

## Backend & Systems
- Basic experience building backend systems using APIs  
- Understanding of authentication mechanisms like JWT  
- Familiar with data pipelines, embeddings, and vector databases (FAISS)  
- Experience working with tools like Redis (caching concepts)  

## Projects & Practical Work
- Built applications involving data ingestion, processing, and retrieval  
- Experience working with semantic search and cosine similarity  
- Hands-on exposure to real-world problem-solving through projects  

## Problem Solving & Thinking
- Ability to break down complex problems into smaller components  
- Focus on first-principles thinking rather than memorization  
- Strong analytical and logical reasoning skills  

## Teaching & Communication
- Ability to explain complex computer science concepts in a clear, structured, and intuitive manner  
- Breaks down topics step-by-step using first principles and real-world analogies  
- Focus on building deep understanding and independent thinking  
- Adapts explanations based on the learner’s level  

## Tools & Technologies
- Languages: C++, Python  
- Libraries/Tools: STL, FAISS, HuggingFace Embeddings  
- Concepts: REST APIs, JWT Authentication, Vector Databases, Caching  

## Learning Mindset
- Continuously learning and exploring new technologies  
- Strong focus on building practical skills alongside theoretical knowledge  
- Interested in AI/ML, analytics, and system design  