"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { CategoryDialog } from "@/components/categories/category-dialog";
import { Page, PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";

import { MonthControl } from "./month-control";
import { WidgetsSection } from "./widgets-section";

export function Dashboard() {
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  return (
    <Page>
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <MonthControl />
            <Button variant="outline" onClick={() => setNewCategoryOpen(true)}>
              <Plus data-icon="inline-start" />
              Add category
            </Button>
          </>
        }
      />
      <WidgetsSection />
      <CategoryDialog
        open={newCategoryOpen}
        onOpenChange={setNewCategoryOpen}
      />
    </Page>
  );
}
