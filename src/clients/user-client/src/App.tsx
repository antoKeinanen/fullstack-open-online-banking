import { Button } from "@repo/web-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/web-ui/card";

function App() {
  return (
    <>
      <Card className="w-fit">
        <CardHeader>
          <CardTitle>Hello World!</CardTitle>
        </CardHeader>
        <CardContent>
          <Button>Hello</Button>
        </CardContent>
      </Card>
    </>
  );
}

export default App;
