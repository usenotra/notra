import { Button } from "@notra/ui/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@notra/ui/components/ui/dialog";
import { Input } from "@notra/ui/components/ui/input";
import { Label } from "@notra/ui/components/ui/label";

export default function DialogExample() {
  return (
    <div className="flex min-h-[24rem] items-center justify-center p-4">
      <Dialog>
        <DialogTrigger render={<Button />}>Add repository</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add repository</DialogTitle>
            <DialogDescription>
              Enter a repository as owner/repo, or paste a GitHub URL. Notra
              starts drafting from new activity.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="repository">Repository</Label>
            <Input
              defaultValue="notra-ai/notra"
              id="repository"
              placeholder="owner/repo"
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <DialogClose render={<Button />}>Add repository</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
