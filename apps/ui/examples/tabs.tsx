import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@notra/ui/components/ui/tabs";

export default function TabsExample() {
  return (
    <div className="p-4">
      <Tabs defaultValue="changelog">
        <TabsList>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
          <TabsTrigger value="blog">Blog</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
        </TabsList>
        <TabsContent value="changelog">Drafts from merged PRs.</TabsContent>
        <TabsContent value="blog">Longer posts from closed issues.</TabsContent>
        <TabsContent value="social">Short updates for Twitter.</TabsContent>
      </Tabs>
    </div>
  );
}
