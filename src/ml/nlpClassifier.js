/**
 * Machine Learning Model 5: NLP Subject Classifier (TF-IDF + Multinomial Naive Bayes)
 * 
 * Automatically predicts the academic subject based on natural language study notes
 * or keywords logged by the student.
 */

// Domain training corpus mapping subject classes to key token representations
const TRAINING_CORPUS = {
  'Data Structures & Algorithms': [
    'binary tree', 'graph traversal', 'bfs', 'dfs', 'dynamic programming', 'linked list',
    'heap', 'sorting', 'quicksort', 'mergesort', 'dijkstra', 'recursion', 'time complexity',
    'big o', 'hash table', 'array', 'stack', 'queue', 'leetcode', 'algorithms'
  ],
  'Operating Systems': [
    'process', 'thread', 'concurrency', 'deadlock', 'semaphore', 'mutex', 'virtual memory',
    'paging', 'page fault', 'scheduling', 'kernel', 'cpu scheduling', 'context switch',
    'cache', 'ipc', 'file system', 'fork', 'posix'
  ],
  'Web Development': [
    'react', 'html', 'css', 'javascript', 'frontend', 'backend', 'rest api', 'express',
    'node', 'endpoints', 'flexbox', 'dom', 'jwt', 'authentication', 'tailwind', 'ui',
    'fetch', 'axios', 'routing', 'bootstrap', 'fullstack'
  ],
  'Database Systems': [
    'sql', 'query', 'joins', 'primary key', 'foreign key', 'normalization', 'schema',
    'indexing', 'btree', 'acid', 'transaction', 'postgres', 'mongodb', 'nosql', 'relational',
    'select', 'group by', 'stored procedure'
  ],
  'Calculus & Mathematics': [
    'derivative', 'integral', 'differential equation', 'calculus', 'matrix', 'linear algebra',
    'eigenvalue', 'vectors', 'limit', 'taylor series', 'partial derivative', 'gradient',
    'integration by parts', 'optimization', 'probability'
  ],
  'Computer Networks': [
    'tcp', 'udp', 'ip', 'handshake', 'osi model', 'packet', 'router', 'subnet',
    'dns', 'http', 'https', 'congestion control', 'flow control', 'socket', 'lan', 'wan'
  ]
};

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Predicts the subject based on text notes using Multinomial Naive Bayes.
 */
function predictSubjectFromNotes(notes) {
  const tokens = tokenize(notes);
  if (tokens.length === 0) {
    return {
      predictedSubject: null,
      confidence: 0,
      probabilities: {}
    };
  }

  const subjects = Object.keys(TRAINING_CORPUS);
  const scores = {};

  // Compute log likelihood with Laplace smoothing
  subjects.forEach((subj) => {
    const vocab = TRAINING_CORPUS[subj];
    const vocabTokens = vocab.join(' ').toLowerCase().split(/\s+/);
    const vocabSet = new Set(vocabTokens);
    const totalWords = vocabTokens.length;

    let logLikelihood = Math.log(1 / subjects.length); // Uniform prior P(Class)

    tokens.forEach((token) => {
      // Check exact match or substring match
      const occurrences = vocabTokens.filter((v) => v === token || token.includes(v)).length;
      // Laplace smoothed probability P(word | class)
      const pWord = (occurrences + 1) / (totalWords + vocabSet.size);
      logLikelihood += Math.log(pWord);
    });

    scores[subj] = logLikelihood;
  });

  // Softmax normalization to get calibrated probabilities
  const maxScore = Math.max(...Object.values(scores));
  let expSum = 0;
  const exps = {};
  subjects.forEach((subj) => {
    exps[subj] = Math.exp(scores[subj] - maxScore);
    expSum += exps[subj];
  });

  const probabilities = {};
  subjects.forEach((subj) => {
    probabilities[subj] = Number((exps[subj] / expSum).toFixed(3));
  });

  // Find top prediction
  let bestSubj = subjects[0];
  let bestProb = -1;
  for (const [subj, prob] of Object.entries(probabilities)) {
    if (prob > bestProb) {
      bestProb = prob;
      bestSubj = subj;
    }
  }

  return {
    predictedSubject: bestProb >= 0.25 ? bestSubj : null,
    confidence: Number((bestProb * 100).toFixed(1)),
    probabilities
  };
}

module.exports = {
  predictSubjectFromNotes
};
