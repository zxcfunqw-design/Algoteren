import type { PlatformData } from "../types";

export const cppStarter = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        // solve here
    }
    return 0;
}`;

export const pythonStarter = `import sys

def solve() -> None:
    data = sys.stdin.read().strip().split()
    # solve here

if __name__ == "__main__":
    solve()
`;

export const fallbackData: PlatformData = {
  tasks: [
    {
      id: "surfing-powerups",
      slug: "surfing-powerups",
      title: "Surfing Through Obstacles",
      source: "NIS Binary archive, inspired by Codeforces practice",
      difficulty: "Simple",
      topics: ["Greedy Algorithms", "Priority Queue", "Sorting"],
      tags: ["#задача", "#простое"],
      division: "E-F",
      points: 800,
      timeLimit: "1 second",
      memoryLimit: "256 MB",
      statement:
        "A surfer moves from coordinate 1 to L. Some intervals are blocked by obstacles, and power-ups increase jump strength. Find the minimum number of power-ups needed to pass all obstacles.",
      input:
        "The first line contains t. Each test contains n obstacles, m power-ups, and endpoint L. Then n obstacle intervals and m power-up pairs follow.",
      output: "For each test case, print the minimum number of used power-ups or -1 if the route is impossible.",
      constraints: ["1 <= t <= 10^4", "1 <= n, m <= 2 * 10^5", "1 <= L <= 10^9"],
      samples: [
        {
          input: "1\n2 3 20\n4 7\n11 13\n2 4\n8 5\n10 6\n",
          output: "2"
        }
      ],
      tests: [
        { id: "sample", input: "1\n2 3 20\n4 7\n11 13\n2 4\n8 5\n10 6\n", output: "2", weight: 25 },
        { id: "no-power", input: "1\n1 0 9\n3 7\n", output: "-1", weight: 25 },
        { id: "sorted-events", input: "1\n1 2 10\n6 7\n2 2\n5 4\n", output: "1", weight: 25 },
        { id: "many-events", input: "1\n2 4 30\n8 11\n19 22\n1 2\n4 5\n12 6\n17 8\n", output: "3", weight: 25 }
      ],
      solutionSignals: ["priority_queue", "heapq", "sort", "current_power"],
      analysisId: "analysis-surfing"
    },
    {
      id: "tle-or-ok",
      slug: "tle-or-ok",
      title: "TLE or Accepted",
      source: "Codeforces Round 903 Div.3, AlgoTeren complexity lesson",
      difficulty: "Simple",
      topics: ["Time Complexity", "Nested Loops", "Hashing"],
      tags: ["#задача", "#простое"],
      division: "E-F",
      points: 700,
      timeLimit: "2 seconds",
      memoryLimit: "256 MB",
      statement:
        "Given two code sketches for the same counting task, determine which approach fits the constraints and implement the accepted one.",
      input: "The first line contains n, followed by n integers.",
      output: "Print the number of valid pairs.",
      constraints: ["1 <= n <= 2 * 10^5", "1 <= a[i] <= 10^9"],
      samples: [{ input: "5\n1 2 3 4 5\n", output: "4" }],
      tests: [
        { id: "sample", input: "5\n1 2 3 4 5\n", output: "4", weight: 40 },
        { id: "large-hint", input: "6\n1 1 2 2 3 3\n", output: "6", weight: 60 }
      ],
      solutionSignals: ["unordered_map", "map", "dict", "O(n)"],
      analysisId: "analysis-complexity"
    },
    {
      id: "xor-kingdom",
      slug: "xor-kingdom",
      title: "XOR Kingdom",
      source: "NIS Binary weekly problem",
      difficulty: "Medium",
      topics: ["Bitwise", "Greedy Algorithms", "Constructive"],
      tags: ["#задача", "#среднее"],
      division: "C-D",
      points: 1400,
      timeLimit: "2 seconds",
      memoryLimit: "256 MB",
      statement:
        "For each query, construct the largest possible value after applying independent bit decisions over a range of candidates.",
      input: "The first line contains q. Each query contains l, r, and x.",
      output: "Print the best attainable value for each query.",
      constraints: ["1 <= q <= 2 * 10^5", "0 <= l <= r < 2^30"],
      samples: [{ input: "3\n1 5 2\n4 9 7\n0 0 3\n", output: "7\n15\n3" }],
      tests: [
        { id: "sample", input: "3\n1 5 2\n4 9 7\n0 0 3\n", output: "7\n15\n3", weight: 35 },
        { id: "edge", input: "1\n0 7 8\n", output: "15", weight: 65 }
      ],
      solutionSignals: ["bit", "xor", "<<", "range"],
      analysisId: "analysis-xor"
    },
    {
      id: "bank-transfers",
      slug: "bank-transfers",
      title: "Bank Transfer Capacity",
      source: "AlgoTeren binary search week",
      difficulty: "Simple",
      topics: ["Binary Search", "Math", "Answer Search"],
      tags: ["#задача", "#простое"],
      division: "E-F",
      points: 900,
      timeLimit: "1 second",
      memoryLimit: "256 MB",
      statement:
        "Each bank has a balance a[i]. One transfer consumes x units from one bank. Find the maximum x so that at least k transfers can be made.",
      input: "The first line contains n and k. The second line contains n balances.",
      output: "Print the maximum transfer size x.",
      constraints: ["1 <= n <= 2 * 10^5", "1 <= k <= 10^12", "1 <= a[i] <= 10^12"],
      samples: [{ input: "4 5\n10 7 3 9\n", output: "4" }],
      tests: [
        { id: "sample", input: "4 5\n10 7 3 9\n", output: "4", weight: 50 },
        { id: "wide", input: "3 6\n100 100 100\n", output: "50", weight: 50 }
      ],
      solutionSignals: ["while", "mid", "binary", "floor", "/ x"],
      analysisId: "analysis-binary"
    },
    {
      id: "cube-box",
      slug: "cube-box",
      title: "Cubes in a Box",
      source: "First author problem from AlgoTeren",
      difficulty: "Medium",
      topics: ["Binary Search", "Geometry", "Overflow Safety"],
      tags: ["#задача", "#среднее"],
      division: "C-D",
      points: 1500,
      timeLimit: "1 second",
      memoryLimit: "256 MB",
      statement:
        "Given a box A by B by C, find the largest integer cube side s such that at least n cubes of side s fit inside.",
      input: "The first line contains A, B, C, and n.",
      output: "Print the largest valid cube side.",
      constraints: ["1 <= A, B, C <= 10^18", "1 <= n <= 10^18"],
      samples: [{ input: "10 10 10 8\n", output: "5" }],
      tests: [
        { id: "sample", input: "10 10 10 8\n", output: "5", weight: 40 },
        { id: "thin-box", input: "100 3 3 10\n", output: "2", weight: 60 }
      ],
      solutionSignals: ["binary", "mid", "A / mid", "__int128", "while"],
      analysisId: "analysis-cubes"
    },
    {
      id: "two-pointer-archive",
      slug: "two-pointer-archive",
      title: "Training Segments",
      source: "AlgoTeren Prep Contest #2",
      difficulty: "Hard",
      topics: ["Two Pointers", "Prefix Sums", "Greedy Algorithms"],
      tags: ["#задача", "#сложное"],
      division: "A-B",
      points: 1900,
      timeLimit: "2 seconds",
      memoryLimit: "256 MB",
      statement:
        "Find the longest segment whose total difficulty is at most S while each adjacent pair keeps the weekly monotonic training rule.",
      input: "The first line contains n and S. The next line contains n lesson difficulties.",
      output: "Print the maximum valid segment length.",
      constraints: ["1 <= n <= 2 * 10^5", "1 <= S <= 10^14", "1 <= a[i] <= 10^9"],
      samples: [{ input: "6 12\n2 3 4 9 1 2\n", output: "3" }],
      tests: [
        { id: "sample", input: "6 12\n2 3 4 9 1 2\n", output: "3", weight: 35 },
        { id: "all-fit", input: "5 20\n1 2 3 4 5\n", output: "5", weight: 65 }
      ],
      solutionSignals: ["two", "left", "right", "prefix", "while"],
      analysisId: "analysis-two-pointers"
    }
  ],
  articles: [
    {
      id: "idea-complexity",
      tag: "#идея",
      title: "Time Complexity Without Guessing",
      excerpt: "How constraints point to O(n), O(n log n), O(log n), or formula-based solutions.",
      readingTime: "6 min",
      topics: ["Big-O", "Theta", "Omega", "Constraints"],
      sections: [
        {
          heading: "Start from constraints",
          body:
            "The channel repeatedly uses constraints as a clue. n <= 2 * 10^5 usually asks for O(n log n) or better. n <= 10^9 asks for math, greedy proof, or logarithmic search."
        },
        {
          heading: "Use tight language",
          body:
            "O(n) is an upper bound, Theta(n) is a tight bound, and Omega(n) is a lower bound. In editorials, prefer the tightest useful statement."
        },
        {
          heading: "C++ fast input template",
          body: "For large tests, switch off sync and untie streams before reading input.",
          code: `ios::sync_with_stdio(false);
cin.tie(nullptr);`
        }
      ]
    },
    {
      id: "idea-greedy",
      tag: "#идея",
      title: "Greedy Algorithms: Local Choice, Global Proof",
      excerpt: "A beginner-friendly way to know when choosing the current best option is safe.",
      readingTime: "7 min",
      topics: ["Greedy Algorithms", "Exchange Argument", "Priority Queue"],
      sections: [
        {
          heading: "Greedy needs a reason",
          body:
            "A greedy solution is not just choosing what looks good now. It needs a proof that any optimal answer can be transformed to include the greedy choice."
        },
        {
          heading: "Common pattern",
          body:
            "Sort events, process them left to right, and keep available choices in a heap. When a requirement appears, spend the strongest available resource."
        },
        {
          heading: "Stress testing",
          body: "Use Python to compare a brute force solution against the greedy solution on random small tests.",
          code: `for n in range(1, 9):
    for seed in range(500):
        test = generate(seed, n)
        assert brute(test) == greedy(test)`
        }
      ]
    },
    {
      id: "idea-binary-search",
      tag: "#идея",
      title: "Binary Search on the Answer",
      excerpt: "Turn a hard optimization problem into a yes-or-no predicate.",
      readingTime: "5 min",
      topics: ["Binary Search", "Predicate", "Overflow Safety"],
      sections: [
        {
          heading: "Predicate first",
          body:
            "Before writing the loop, define can(x). If can(x) is monotonic, binary search becomes mechanical."
        },
        {
          heading: "Upper bounds",
          body:
            "Pick a safe high value from constraints. In geometry and multiplication tasks, protect intermediate products from overflow."
        },
        {
          heading: "Template",
          body: "This version finds the maximum x for which can(x) is true.",
          code: `long long lo = 0, hi = 1e18;
while (lo < hi) {
    long long mid = lo + (hi - lo + 1) / 2;
    if (can(mid)) lo = mid;
    else hi = mid - 1;
}`
        }
      ]
    },
    {
      id: "analysis-surfing",
      tag: "#разбор",
      title: "Surfing Through Obstacles Analysis",
      excerpt: "Sort events, collect power-ups, and spend the largest only when an obstacle forces it.",
      readingTime: "8 min",
      topics: ["Greedy Algorithms", "Priority Queue"],
      sections: [
        {
          heading: "Key observation",
          body:
            "A power-up before an obstacle can be used later, so we delay using it until the obstacle cannot be crossed with current power."
        },
        {
          heading: "Implementation",
          body:
            "Sort all events by coordinate. Push power-ups into a max-heap. For each obstacle, pop the strongest available power-up until the jump is large enough.",
          code: `while (!power_ups.empty() && current_power < need) {
    current_power += power_ups.top();
    power_ups.pop();
}`
        }
      ]
    },
    {
      id: "analysis-binary",
      tag: "#разбор",
      title: "Bank Transfer Capacity Analysis",
      excerpt: "The predicate counts how many transfers are possible for a fixed x.",
      readingTime: "4 min",
      topics: ["Binary Search", "Math"],
      sections: [
        {
          heading: "Predicate",
          body:
            "For fixed x, bank i can make floor(a[i] / x) transfers. If the total is at least k, x is feasible."
        },
        {
          heading: "Takeaway",
          body:
            "When bigger answers make the condition harder, use binary search for the maximum true value."
        }
      ]
    },
    {
      id: "analysis-two-pointers",
      tag: "#разбор",
      title: "Training Segments Analysis",
      excerpt: "Maintain a valid moving window instead of recomputing each segment.",
      readingTime: "6 min",
      topics: ["Two Pointers", "Prefix Sums"],
      sections: [
        {
          heading: "Window invariant",
          body:
            "The right pointer expands the segment. The left pointer moves only when the sum becomes too large or the monotonic rule breaks."
        },
        {
          heading: "Why it is linear",
          body:
            "Each pointer moves at most n times, so the whole scan is O(n)."
        }
      ]
    }
  ],
  standings: [
    { rank: 1, name: "Aruzhan K.", division: "A-B", solved: 24, points: 3820, rating: 1788, change: 42, lastSubmit: "2 min ago", streak: 9 },
    { rank: 2, name: "Miras S.", division: "A-B", solved: 22, points: 3610, rating: 1736, change: 28, lastSubmit: "11 min ago", streak: 7 },
    { rank: 3, name: "Daniyal T.", division: "C-D", solved: 19, points: 2980, rating: 1604, change: 61, lastSubmit: "18 min ago", streak: 5 },
    { rank: 4, name: "Nurai B.", division: "C-D", solved: 17, points: 2660, rating: 1519, change: -13, lastSubmit: "41 min ago", streak: 6 },
    { rank: 5, name: "Adil Z.", division: "E-F", solved: 14, points: 2140, rating: 1392, change: 74, lastSubmit: "1 hour ago", streak: 4 },
    { rank: 6, name: "Sanzhar I.", division: "E-F", solved: 12, points: 1890, rating: 1324, change: 16, lastSubmit: "2 hours ago", streak: 3 }
  ],
  contests: [
    {
      id: "monthly-may",
      title: "AlgoTeren Monthly Contest",
      status: "Active",
      window: "May 30, 19:00-21:30",
      taskCount: 4,
      participants: 86,
      topScore: 3200
    },
    {
      id: "prep-2",
      title: "AlgoTeren Prep Contest #2",
      status: "Finished",
      window: "May 8",
      taskCount: 4,
      participants: 54,
      topScore: 2800
    },
    {
      id: "binary-basics",
      title: "NIS Binary Basics Sprint",
      status: "Upcoming",
      window: "June 6",
      taskCount: 4,
      participants: 41,
      topScore: 0
    }
  ]
};
