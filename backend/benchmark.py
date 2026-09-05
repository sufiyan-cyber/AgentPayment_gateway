#!/usr/bin/env python
"""
MandateSentinel Benchmark Evaluation CLI
Runs 70/30 train/held-out evaluation and prints precision, recall, F1,
confusion matrix, latency, and financial volume metrics.
"""
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.evaluator import evaluator_service


def main():
    print("=" * 70)
    print("  MANDATESENTINEL - HELD-OUT BENCHMARK EVALUATION")
    print("=" * 70)
    print("Generating synthetic agent transactions (80% clean, 20% adversarial across 5 attack vectors)...")
    print("Training Isolation Forest strictly on clean training split (70%)...")
    print("Evaluating held-out test split (30%)...\n")

    metrics = evaluator_service.run_pipeline(num_sessions=120, target_requests=1000)

    summary = metrics["summary"]
    cm = metrics["confusion_matrix"]
    lat = metrics["latency"]
    fin = metrics["financial_volume"]
    attacks = metrics["attack_breakdown"]

    print("----------------------------------------------------------------------")
    print(" 1. HEADLINE PERFORMANCE METRICS (HELD-OUT SET)")
    print("----------------------------------------------------------------------")
    print(f"  Total Held-Out Requests : {summary['total_eval_requests']}")
    print(f"  Precision               : {summary['precision']:.4f} (Target: >= 0.85)")
    print(f"  Recall                  : {summary['recall']:.4f} (Target: >= 0.85)")
    print(f"  F1 Score                : {summary['f1_score']:.4f}")
    print(f"  Accuracy                : {summary['accuracy']:.4f}")

    print("\n----------------------------------------------------------------------")
    print(" 2. CONFUSION MATRIX")
    print("----------------------------------------------------------------------")
    print(f"  True Positives  (TP) : {cm['true_positives']} (Adversarial correctly flagged)")
    print(f"  False Positives (FP) : {cm['false_positives']} (Clean routed to Step-Up / Review)")
    print(f"  True Negatives  (TN) : {cm['true_negatives']} (Clean approved)")
    print(f"  False Negatives (FN) : {cm['false_negatives']} (Adversarial missed)")

    print("\n----------------------------------------------------------------------")
    print(" 3. LATENCY BENCHMARK (SLA: <300ms)")
    print("----------------------------------------------------------------------")
    print(f"  Average Latency : {lat['avg_ms']:.2f} ms")
    print(f"  p50 Latency     : {lat['p50_ms']:.2f} ms")
    print(f"  p95 Latency     : {lat['p95_ms']:.2f} ms")
    print(f"  p99 Latency     : {lat['p99_ms']:.2f} ms")
    print(f"  SLA Compliance  : {lat['sla_compliance_percent']}% (<300ms)")

    print("\n----------------------------------------------------------------------")
    print(" 4. FINANCIAL RISK VOLUME EXPOSURE")
    print("----------------------------------------------------------------------")
    print(f"  Total Volume Requested : INR {fin['total_requested_inr']:,.2f}")
    print(f"  Approved Volume        : INR {fin['approved_inr']:,.2f}")
    print(f"  Stepped-Up Volume      : INR {fin['stepped_up_inr']:,.2f}")
    print(f"  Blocked Volume         : INR {fin['blocked_inr']:,.2f}")
    print(f"  Adversarial Prevented  : INR {fin['adversarial_prevented_inr']:,.2f}")

    print("\n----------------------------------------------------------------------")
    print(" 5. ATTACK VECTOR BREAKDOWN")
    print("----------------------------------------------------------------------")
    for atk, data in attacks.items():
        det_rate = (data['blocked'] + data['stepped_up']) / max(1, data['total']) * 100
        print(f"  {atk:<16}: Total={data['total']:<3} Blocked={data['blocked']:<3} SteppedUp={data['stepped_up']:<3} (Detection: {det_rate:.1f}%)")

    print("=" * 70)


if __name__ == "__main__":
    main()
