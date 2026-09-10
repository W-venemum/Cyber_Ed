"""Pairwise separability via Jensen-Shannon divergence (deterministic).

We represent each misconception state as a predicted probability distribution
over an assessment item's answer options. The separability of two states on an
item is how different their predicted answer distributions are: if two states
predict very different answers, the item separates them well; if they predict
the same answers, the item cannot tell them apart (a diagnostic blind spot).

Exact formula (documented per spec)
------------------------------------
Given two probability distributions P and Q over the same options:

    M     = (P + Q) / 2
    KL(A||B) = sum_i A_i * log2(A_i / B_i)     (terms with A_i == 0 are skipped)
    JSD(P, Q) = 0.5 * KL(P||M) + 0.5 * KL(Q||M)

With the base-2 logarithm, JSD is symmetric and bounded in [0, 1]:
    JSD = 0 when P == Q (indistinguishable states, a blind spot)
    JSD = 1 when P and Q have disjoint support (perfectly separated)

The separability score IS this JSD value. There is no randomness anywhere in
this module; identical inputs always produce identical outputs.
"""

from __future__ import annotations

import math
from collections.abc import Iterable, Mapping

# Any probability below this is treated as zero (guards floating-point noise).
_EPS = 1e-12


def _normalize(dist: Iterable[float]) -> list[float]:
    """Return the distribution scaled to sum to 1.0.

    Authored demo distributions may sum to slightly off 1.0 due to rounding;
    normalizing keeps JSD well-defined and in [0, 1].
    """
    values = [max(0.0, float(v)) for v in dist]
    total = math.fsum(values)
    if total <= 0:
        raise ValueError("Cannot normalize a distribution whose values sum to 0.")
    return [v / total for v in values]


def kl_divergence(p: Iterable[float], q: Iterable[float]) -> float:
    """Kullback-Leibler divergence KL(p||q) using log base 2.

    Terms where ``p_i == 0`` are skipped (0 * log 0 := 0). ``q_i`` is expected
    to be positive wherever ``p_i`` is positive; when the caller uses the JSD
    mixture M = (P+Q)/2 as ``q`` this is always satisfied.
    """
    p_norm = _normalize(p)
    q_norm = _normalize(q)
    total = 0.0
    for pi, qi in zip(p_norm, q_norm):
        if pi <= _EPS:
            continue  # skip terms where p_i = 0
        if qi <= _EPS:
            # p has support where q does not: KL is +inf in theory. This never
            # happens for the JSD mixture, but guard defensively.
            raise ValueError("KL divergence undefined: q_i = 0 where p_i > 0.")
        total += pi * math.log2(pi / qi)
    return total


def js_divergence(p: Iterable[float], q: Iterable[float]) -> float:
    """Jensen-Shannon divergence (log base 2), bounded in [0, 1].

    JSD(P, Q) = 0.5 * KL(P||M) + 0.5 * KL(Q||M), where M = (P + Q) / 2.
    """
    p_norm = _normalize(p)
    q_norm = _normalize(q)
    m = [(pi + qi) / 2.0 for pi, qi in zip(p_norm, q_norm)]
    jsd = 0.5 * kl_divergence(p_norm, m) + 0.5 * kl_divergence(q_norm, m)
    # Clamp tiny negative/over-one values from floating point into [0, 1].
    return max(0.0, min(1.0, jsd))


def separability_from_maps(
    dist_a: Mapping[str, float],
    dist_b: Mapping[str, float],
    option_ids: Iterable[str],
) -> float:
    """Separability between two per-option distribution maps.

    The two maps are aligned onto the shared ``option_ids`` ordering so the
    JSD is computed over the same option vector. Missing options are treated as
    probability 0 for that state.
    """
    order = list(option_ids)
    vec_a = [float(dist_a.get(opt, 0.0)) for opt in order]
    vec_b = [float(dist_b.get(opt, 0.0)) for opt in order]
    return js_divergence(vec_a, vec_b)
