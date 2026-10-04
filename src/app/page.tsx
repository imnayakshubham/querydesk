import Link from "next/link"
import { connection } from "next/server"
import { ActionButton } from "@/components/action-button"
import { StatusBadge } from "@/components/badges"
import { FirstVisitStrip } from "@/components/first-visit-strip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { loadQueue } from "@/lib/desk"

export default async function QueuePage() {
  await connection()
  const queue = await loadQueue()

  return (
    <>
      <FirstVisitStrip />
      <h1 className="mb-1 text-xl font-semibold">Claim queue</h1>
      <p className="mb-6 text-muted-foreground">
        Patients ready for discharge, with their cashless claim status.
      </p>

      {queue.length === 0 ? (
        <p className="text-muted-foreground">
          No claims in the repository yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Insurer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Open insurer query</TableHead>
              <TableHead>Next step</TableHead>
              <TableHead>Demo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.map(({ claim, status, openQuery, nextStep }) => (
              <TableRow key={claim.id}>
                <TableCell>
                  <Link
                    href={`/claims/${claim.id}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {claim.id}
                  </Link>
                </TableCell>
                <TableCell>{claim.patient}</TableCell>
                <TableCell>{claim.insurer}</TableCell>
                <TableCell>
                  <StatusBadge status={status} />
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal">
                  {openQuery ? (
                    <span title={openQuery} className="line-clamp-2">
                      {openQuery}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell className="max-w-56 whitespace-normal">
                  <Link
                    href={`/claims/${claim.id}`}
                    className="text-primary hover:underline"
                  >
                    {nextStep} →
                  </Link>
                </TableCell>
                <TableCell>
                  <ActionButton
                    endpoint={`/api/claims/${claim.id}/query`}
                    variant="outline"
                    label="Simulate insurer query"
                    workingLabel="Receiving query…"
                    successMessage="Query received."
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}
