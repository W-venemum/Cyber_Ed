"""Unit tests for the JSD separability primitives."""

from __future__ import annotations

import math

from app.engine.separability import js_divergence, kl_divergence, separability_from_maps


def test_identical_distributions_near_zero():
    """Identical distributions -> separability ~ 0 (a blind spot)."""
    p = [0.25, 0.25, 0.25, 0.25]
    assert js_divergence(p, p) == 0.0

    q = [0.7, 0.1, 0.1, 0.1]
    assert js_divergence(q, list(q)) == 0.0


def test_distinct_distributions_higher_separability():
    """More distinct distributions -> higher separability."""
    near = js_divergence([0.5, 0.5, 0.0, 0.0], [0.45, 0.45, 0.05, 0.05])
    far = js_divergence([0.9, 0.1, 0.0, 0.0], [0.0, 0.0, 0.1, 0.9])
    assert far > near
    assert 0.0 <= near <= 1.0
    assert 0.0 <= far <= 1.0


def test_disjoint_support_is_maximal():
    """Disjoint support -> JSD == 1 (perfect separation) with log base 2."""
    p = [1.0, 0.0]
    q = [0.0, 1.0]
    assert math.isclose(js_divergence(p, q), 1.0, abs_tol=1e-9)


def test_jsd_symmetric():
    p = [0.7, 0.2, 0.1]
    q = [0.1, 0.3, 0.6]
    assert math.isclose(js_divergence(p, q), js_divergence(q, p), abs_tol=1e-12)


def test_jsd_bounded():
    p = [0.6, 0.3, 0.1]
    q = [0.2, 0.2, 0.6]
    val = js_divergence(p, q)
    assert 0.0 <= val <= 1.0


def test_kl_skips_zero_terms():
    # p_i = 0 terms are skipped; the mixture m has support everywhere p or q do.
    p = [0.0, 1.0]
    m = [0.25, 0.75]
    val = kl_divergence(p, m)
    assert math.isclose(val, math.log2(1.0 / 0.75), abs_tol=1e-12)


def test_separability_from_maps_aligns_options():
    dist_a = {"A": 0.9, "B": 0.1}
    dist_b = {"B": 0.1, "A": 0.9}
    # Same distributions, different key order -> aligned -> zero separability.
    assert separability_from_maps(dist_a, dist_b, ["A", "B", "C"]) == 0.0
