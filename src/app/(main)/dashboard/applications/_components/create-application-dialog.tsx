"use client";

import * as React from "react";
import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

// Import options from constants
import { AgeOptions } from "@/constants/AgeOptions";
import { Genders } from "@/constants/Genders";
import { Pronouns } from "@/constants/Pronouns";
import { Schools } from "@/constants/Schools";
import { Faculties } from "@/constants/Faculties";
import { LevelOfStudyTypes } from "@/constants/LevelOfStudyTypes";
import { Programs } from "@/constants/Programs";
import { GraduationSemesters } from "@/constants/GraduationSemesters";
import { GraduationYears } from "@/constants/GraduationYears";
import { TShirtSizes } from "@/constants/TShirtSizes";
import { DietaryRestrictions } from "@/constants/DietaryRestrictions";
import { CommunicationLanguages } from "@/constants/CommunicationLanguages";
import { WorkingLanguages } from "@/constants/WorkingLanguages";
import { WorkRegions } from "@/constants/WorkRegions";
import { JobTypes } from "@/constants/JobTypes";
import { JobRoles } from "@/constants/JobRoles";
import { CoopTerms } from "@/constants/CoopTerms";
import { statuses } from "@/constants/statuses";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  isEighteenOrAbove: z.string().min(1, "Age verification is required"),
  phoneNumber: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  school: z.string().optional(),
  faculty: z.string().optional(),
  levelOfStudy: z.string().optional(),
  program: z.string().optional(),
  graduationSemester: z.string().optional(),
  graduationYear: z.string().optional(),
  coolProject: z.string().optional(),
  excitedAbout: z.string().optional(),
  travelReimbursement: z.boolean().default(false),
  preferredLanguage: z.string().optional(),
  workingLanguages: z.string().optional(), // Handled as comma-separated string
  shirtSize: z.string().optional(),
  dietaryRestrictions: z.string().optional(), // Handled as comma-separated string
  dietaryRestrictionsDescription: z.string().optional(),
  github: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.includes("github.com") || val.startsWith("https://"),
      { message: "Please enter a valid GitHub URL" },
    ),
  linkedin: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || val.includes("linkedin.com") || val.startsWith("https://"),
      { message: "Please enter a valid LinkedIn URL" },
    ),
  gender: z.string().optional(),
  pronouns: z.string().optional(),
  underrepresented: z.string().optional(),
  jobRolesLookingFor: z.string().optional(),
  workRegions: z.string().optional(), // Handled as comma-separated string
  jobTypesInterested: z.string().optional(), // Handled as comma-separated string
  isRegisteredForCoop: z.boolean().default(false),
  nextCoopTerm: z.string().optional(),
  status: z.string().default("Submitted"),
  comments: z.string().optional(),
  skillTags: z.string().optional(), // Handled as comma-separated string
  // "Other" fields for custom values
  schoolOther: z.string().optional(),
  facultyOther: z.string().optional(),
  levelOfStudyOther: z.string().optional(),
  programOther: z.string().optional(),
  workRegionsOther: z.string().optional(),
  jobTypesInterestedOther: z.string().optional(),
  nextCoopTermOther: z.string().optional(),
  workingLanguagesOther: z.string().optional(),
  // MLH Terms and Conditions
  mlhConduct: z.boolean().default(false),
  mlhTerms: z.boolean().default(false),
  mlhEmails: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateApplicationDialog({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolPopoverOpen, setSchoolPopoverOpen] = useState(false);

  // Memoize all dropdown options to prevent recalculation on every render
  const ageOpts = useMemo(
    () => AgeOptions("en").filter((o) => o.value !== ""),
    [],
  );
  const genderOpts = useMemo(
    () => Genders("en").filter((o) => o.value !== ""),
    [],
  );
  const pronounOpts = useMemo(
    () => Pronouns("en").filter((o) => o.value !== ""),
    [],
  );
  const schoolOpts = useMemo(
    () => Schools("en").filter((o) => o.value !== ""),
    [],
  );
  const facultyOpts = useMemo(
    () => Faculties("en").filter((o) => o.value !== ""),
    [],
  );
  const studyOpts = useMemo(
    () => LevelOfStudyTypes("en").filter((o) => o.value !== ""),
    [],
  );
  const programOpts = useMemo(
    () => Programs("en").filter((o) => o.value !== ""),
    [],
  );
  const semOpts = useMemo(
    () => GraduationSemesters("en").filter((o) => o.value !== ""),
    [],
  );
  const yearOpts = useMemo(
    () => GraduationYears("en").filter((o) => o.value !== ""),
    [],
  );
  const shirtOpts = useMemo(
    () => TShirtSizes("en").filter((o) => o.value !== ""),
    [],
  );
  const langOpts = useMemo(
    () => CommunicationLanguages("en").filter((o) => o.value !== ""),
    [],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      isEighteenOrAbove: "",
      phoneNumber: "",
      country: "",
      city: "",
      school: "",
      faculty: "",
      levelOfStudy: "",
      program: "",
      graduationSemester: "",
      graduationYear: "",
      coolProject: "",
      excitedAbout: "",
      travelReimbursement: false,
      preferredLanguage: "",
      workingLanguages: "",
      shirtSize: "",
      dietaryRestrictions: "",
      dietaryRestrictionsDescription: "",
      github: "",
      linkedin: "",
      gender: "",
      pronouns: "",
      underrepresented: "",
      jobRolesLookingFor: "",
      workRegions: "",
      jobTypesInterested: "",
      isRegisteredForCoop: false,
      nextCoopTerm: "",
      status: "Submitted",
      comments: "",
      skillTags: "",
      // "Other" fields
      schoolOther: "",
      facultyOther: "",
      levelOfStudyOther: "",
      programOther: "",
      workRegionsOther: "",
      jobTypesInterestedOther: "",
      nextCoopTermOther: "",
      workingLanguagesOther: "",
      // MLH Terms
      mlhConduct: false,
      mlhTerms: false,
      mlhEmails: false,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true);

      // Transform MLH fields into termsAndConditions object
      const { mlhConduct, mlhTerms, mlhEmails, ...restValues } = values;
      const submitData = {
        ...restValues,
        termsAndConditions: {
          mlhConduct: mlhConduct ?? false,
          mlhTerms: mlhTerms ?? false,
          mlhEmails: mlhEmails ?? false,
        },
      };

      const response = await fetch("/api/application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create application");
      }

      toast.success("Application created successfully");
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Plus className="mr-2 h-4 w-4" />
          Create Application
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Application</DialogTitle>
          <DialogDescription>
            Manually add an application. Separate multiple items (e.g., tags,
            regions) with commas.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="h-[65vh] pr-4">
              <div className="space-y-8">
                {/* Personal Information */}
                <section>
                  <h3 className="text-lg font-medium mb-4">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isEighteenOrAbove"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age Verification *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select age group" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ageOpts.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {genderOpts.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pronouns"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pronouns</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select pronouns" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {pronounOpts.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                <Separator />

                {/* Academic Information */}
                <section>
                  <h3 className="text-lg font-medium mb-4">
                    Academic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="school"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>School</FormLabel>
                          <Popover
                            open={schoolPopoverOpen}
                            onOpenChange={setSchoolPopoverOpen}
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <button
                                  type="button"
                                  role="combobox"
                                  aria-controls="school-listbox"
                                  aria-expanded={schoolPopoverOpen}
                                  className={cn(
                                    "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value
                                    ? (schoolOpts.find(
                                        (opt) => opt.value === field.value,
                                      )?.label ?? field.value)
                                    : "Search schools..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[400px] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder="Type to search schools..." />
                                <CommandList className="max-h-[200px]">
                                  <CommandEmpty>No school found.</CommandEmpty>
                                  <CommandGroup>
                                    {schoolOpts.slice(0, 100).map((opt) => (
                                      <CommandItem
                                        key={opt.value}
                                        value={opt.label}
                                        onSelect={() => {
                                          field.onChange(opt.value);
                                          setSchoolPopoverOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === opt.value
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {opt.label}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="faculty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Faculty</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select faculty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {facultyOpts.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="levelOfStudy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Level of Study</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {studyOpts.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="program"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select program" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {programOpts.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="graduationSemester"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grad. Semester</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sem" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {semOpts.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="graduationYear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grad. Year</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Year" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {yearOpts.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Experience & Interests */}
                <section>
                  <h3 className="text-lg font-medium mb-4">
                    Experience & Interests
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="github"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GitHub URL</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="linkedin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn URL</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="underrepresented"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Underrepresented Group</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Text representation of their choice
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobRolesLookingFor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Job Roles</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="coolProject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cool Project Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="excitedAbout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>What are they excited about?</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="workRegions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Work Regions</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Montreal, Remote"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jobTypesInterested"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Types</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Internship, Full-time"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workingLanguages"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Working Languages</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Javascript, Python"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                <Separator />

                {/* Logistics */}
                <section>
                  <h3 className="text-lg font-medium mb-4">Logistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="shirtSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>T-Shirt Size</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {shirtOpts.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="preferredLanguage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Language</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {langOpts.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="dietaryRestrictions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dietary Restrictions</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Vegetarian, Nut Allergy"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dietaryRestrictionsDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dietary Restrictions Details</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="travelReimbursement"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Applying for travel reimbursement?
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </section>

                <Separator />

                {/* MLH Terms & Conditions */}
                <section>
                  <h3 className="text-lg font-medium mb-4">
                    MLH Terms & Conditions
                  </h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="mlhConduct"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>MLH Code of Conduct</FormLabel>
                            <FormDescription>
                              Agrees to the MLH Code of Conduct
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mlhTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>MLH Terms & Privacy Policy</FormLabel>
                            <FormDescription>
                              Agrees to MLH Terms of Service and Privacy Policy
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mlhEmails"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>MLH Emails</FormLabel>
                            <FormDescription>
                              Agrees to receive emails from MLH
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </section>

                <Separator />

                {/* Admin */}
                <section>
                  <h3 className="text-lg font-medium mb-4">Admin Only</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Initial Status</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {statuses.map((s) => (
                                <SelectItem key={s.name} value={s.name}>
                                  {s.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="skillTags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skill Tags</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Frontend, Design"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Internal Comments</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isRegisteredForCoop"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Registered for Co-op?</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </section>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Creating..." : "Create Application"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
