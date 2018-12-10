from collections import defaultdict as dd
import numpy as np

class Remembrall:

	def __init__(self):
		self.memories = []
		self.memory_tokens = dd(list)

	def remember(self, s):
		i = len(self.memories)
		self.memories.append(s)
		for token in s.split():
			self.memory_tokens[token].append(i)

	def recall(self, s):
		evidence = np.zeros(len(self.memories), dtype=int)
		for token in s.split():
			evidence[self.memory_tokens[token]] += 1
		return self.memories[np.argmax(evidence)]