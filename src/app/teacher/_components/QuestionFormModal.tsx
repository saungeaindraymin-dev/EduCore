"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  quizzesApi,
  type QuestionType,
  type QuizQuestion,
} from "@/lib/api/quizzes";

const MAX_OPTIONS = 10;

const schema = z
  .object({
    type: z.enum(QUESTION_TYPES),
    text: z.string().trim().min(1, "Write the question").max(2000),
    points: z
      .number({ error: "Enter the points" })
      .int("Use a whole number")
      .min(1, "At least 1 point")
      .max(100, "At most 100 points"),
    options: z
      .array(
        z.object({
          text: z.string().trim().min(1, "Write the answer").max(500),
          isCorrect: z.boolean(),
        }),
      )
      .min(2, "A question needs at least two options"),
  })
  .superRefine((v, ctx) => {
    const correct = v.options.filter((o) => o.isCorrect).length;
    if (correct === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Tick the correct answer — that's what marks it",
      });
    }
    if (v.type !== "multiple" && correct > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "This type takes exactly one correct answer",
      });
    }
    if (v.type === "true_false" && v.options.length !== 2) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "True/false takes exactly two options",
      });
    }
  });
type Values = z.infer<typeof schema>;

const fieldClass =
  "h-10 w-full rounded-lg border border-border-soft bg-field px-3 text-sm text-ink focus:border-brand-indigo focus:outline-none aria-invalid:border-danger";

function defaultsFor(question?: QuizQuestion | null): Values {
  if (question) {
    return {
      type: question.type,
      text: question.text,
      points: question.points,
      options: question.options.map((option) => ({
        text: option.text,
        isCorrect: !!option.isCorrect,
      })),
    };
  }
  return {
    type: "single",
    text: "",
    points: 1,
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
    ],
  };
}

/** The marking key lives here: whichever options are ticked are the right answers. */
export function QuestionFormModal({
  open,
  onOpenChange,
  quizId,
  question,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quizId: string;
  question?: QuizQuestion | null;
  onSaved: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor(question),
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "options" });
  const type = useWatch({ control, name: "type" });
  const options = useWatch({ control, name: "options" });

  const handleOpenChange = (next: boolean) => {
    if (!next) setServerError(null);
    onOpenChange(next);
  };

  // Switching type reshapes the answers: true/false is a fixed pair, and the other
  // single-answer types keep only the first tick
  const onTypeChange = (next: QuestionType) => {
    setValue("type", next);
    if (next === "true_false") {
      replace([
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ]);
      return;
    }
    if (next === "single") {
      const current = getValues("options");
      const firstCorrect = current.findIndex((o) => o.isCorrect);
      replace(
        current.map((option, index) => ({
          ...option,
          isCorrect: index === (firstCorrect === -1 ? 0 : firstCorrect),
        })),
      );
    }
  };

  // One answer only: ticking a box unticks the rest
  const onCorrectChange = (index: number, checked: boolean) => {
    if (type === "multiple") {
      setValue(`options.${index}.isCorrect`, checked);
      return;
    }
    const current = getValues("options");
    current.forEach((_, i) => setValue(`options.${i}.isCorrect`, i === index && checked));
  };

  const submit = async (values: Values) => {
    setServerError(null);
    const payload = {
      type: values.type,
      text: values.text,
      points: values.points,
      options: values.options.map((option) => ({
        text: option.text.trim(),
        isCorrect: option.isCorrect,
      })),
    };
    try {
      if (question) await quizzesApi.updateQuestion(quizId, question.id, payload);
      else await quizzesApi.addQuestion(quizId, payload);
      onSaved();
      handleOpenChange(false);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : "Could not save the question");
    }
  };

  const correctCount = (options ?? []).filter((o) => o?.isCorrect).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {question ? "Edit question" : "New question"}
          </DialogTitle>
          <DialogDescription>
            Tick every correct answer — attempts are marked against them automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
            >
              {serverError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="text">Question</Label>
            <textarea
              id="text"
              rows={2}
              {...register("text")}
              aria-invalid={!!errors.text}
              placeholder="What is 6 × 7?"
              className="w-full rounded-lg border border-border-soft bg-field px-3 py-2 text-sm text-ink placeholder:text-sub focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/20 aria-invalid:border-danger"
            />
            {errors.text && <p className="text-sm text-danger">{errors.text.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Answer type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => onTypeChange(e.target.value as QuestionType)}
                className={fieldClass}
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                min={1}
                max={100}
                {...register("points", { valueAsNumber: true })}
                aria-invalid={!!errors.points}
              />
              {errors.points && (
                <p className="text-sm text-danger">{errors.points.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label>Answers</Label>
              <span className="text-xs text-sub">
                {correctCount === 0
                  ? "Tick the correct one"
                  : `${correctCount} marked correct`}
              </span>
            </div>

            <ul className="space-y-2">
              {fields.map((field, index) => (
                <li key={field.id} className="flex items-center gap-2">
                  <input
                    type={type === "multiple" ? "checkbox" : "radio"}
                    aria-label={`Answer ${index + 1} is correct`}
                    checked={!!options?.[index]?.isCorrect}
                    onChange={(e) => onCorrectChange(index, e.target.checked)}
                    className="h-4 w-4 shrink-0 accent-brand-indigo"
                  />
                  <Input
                    {...register(`options.${index}.text`)}
                    aria-label={`Answer ${index + 1}`}
                    placeholder={`Answer ${index + 1}`}
                    disabled={type === "true_false"}
                    aria-invalid={!!errors.options?.[index]?.text}
                    className="disabled:opacity-70"
                  />
                  {type !== "true_false" && fields.length > 2 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label={`Remove answer ${index + 1}`}
                      className="shrink-0 rounded-lg px-2 py-1 text-sm text-sub hover:bg-field hover:text-danger"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {errors.options?.message && (
              <p className="text-sm text-danger">{errors.options.message}</p>
            )}
            {errors.options?.root?.message && (
              <p className="text-sm text-danger">{errors.options.root.message}</p>
            )}
            {Array.isArray(errors.options) &&
              errors.options.some((o) => o?.text) && (
                <p className="text-sm text-danger">Every answer needs some text</p>
              )}

            {type !== "true_false" && fields.length < MAX_OPTIONS && (
              <button
                type="button"
                onClick={() => append({ text: "", isCorrect: false })}
                className="text-sm font-medium text-brand-indigo hover:underline"
              >
                + Add answer
              </button>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-gradient text-white hover:opacity-90"
            >
              {isSubmitting ? "Saving…" : question ? "Save question" : "Add question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
