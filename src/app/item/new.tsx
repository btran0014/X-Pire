import { router } from 'expo-router';
import { useState } from 'react';

import { emptyItemForm, formToItem } from '@/features/items/form-schema';
import { useAddItem } from '@/features/items/hooks';
import { ItemForm } from '@/features/items/item-form';
import { describeError } from '@/lib/errors';

export default function NewItemScreen() {
  const add = useAddItem();
  const [initialValues] = useState(() => emptyItemForm());

  return (
    <ItemForm
      initialValues={initialValues}
      submitLabel="Add to fridge"
      submitting={add.isPending}
      errorMessage={
        add.isError ? describeError(add.error, `Couldn't save: ${add.error.message}`) : null
      }
      onSubmit={(values, product) =>
        add.mutate(formToItem(values, product), {
          onSuccess: () => (router.canGoBack() ? router.back() : router.replace('/')),
        })
      }
    />
  );
}
