import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const INVOICES = [
  { id: "INV-1042", date: "Oct 1, 2026", plan: "Growth", amount: "$250.00" },
  { id: "INV-1018", date: "Sep 1, 2026", plan: "Growth", amount: "$250.00" },
  { id: "INV-0995", date: "Aug 1, 2026", plan: "Starter", amount: "$100.00" },
] as const;

export default function TablePrimitivesExample() {
  return (
    <div className="w-full max-w-2xl p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {INVOICES.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <span className="font-medium">{invoice.id}</span>
              </TableCell>
              <TableCell>{invoice.date}</TableCell>
              <TableCell>{invoice.plan}</TableCell>
              <TableCell className="text-right">{invoice.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
