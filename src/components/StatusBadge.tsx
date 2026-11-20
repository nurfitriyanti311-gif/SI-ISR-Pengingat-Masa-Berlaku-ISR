/* Komponen label status dengan ikon dan warna kontras tinggi untuk status ISR dan log pengiriman. */

import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  MinusCircle,
  XCircle,
} from 'lucide-react';
import { APP_CONFIG } from '../config';
import type { FollowUpStatus, NotificationStatus } from '../types';

interface FollowupBadgeProps {
  status: FollowUpStatus;
  isEligible?: boolean;
}

export function FollowupStatusBadge({ status, isEligible = true }: FollowupBadgeProps) {
  if (!isEligible) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-800 whitespace-nowrap">
        <Archive className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Arsip Non-Aktif</span>
      </span>
    );
  }

  switch (status) {
    case 'Active':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{APP_CONFIG.followupLabels.Active}</span>
        </span>
      );
    case 'Warning_H7':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 whitespace-nowrap">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{APP_CONFIG.followupLabels.Warning_H7}</span>
        </span>
      );
    case 'In_Renewal':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{APP_CONFIG.followupLabels.In_Renewal}</span>
        </span>
      );
    case 'Expired':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-800 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{APP_CONFIG.followupLabels.Expired}</span>
        </span>
      );
    case 'Not_Renewed':
    case 'Incomplete_Date':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-800 whitespace-nowrap">
          <MinusCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{APP_CONFIG.followupLabels[status]}</span>
        </span>
      );
  }
}

export function LogStatusBadge({ status }: { status: NotificationStatus }) {
  switch (status) {
    case 'SUCCESS':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>SUCCESS</span>
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-800 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>FAILED</span>
        </span>
      );
    case 'SKIPPED':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-800 whitespace-nowrap">
          <MinusCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>SKIPPED</span>
        </span>
      );
  }
}
