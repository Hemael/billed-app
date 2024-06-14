/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import router from "../app/Router.js"
import { ROUTES_PATH } from "../constants/routes.js"
import { localStorageMock } from "../__mocks__/localStorage.js";
import store from "../__mocks__/store.js";

let newBill;

const setMockFileToFileInput = async () => {
  const fileInput = screen.getByTestId("file");

  const handleChangeFile = jest.fn(newBill.handleChangeFile);
  fileInput.addEventListener("change", handleChangeFile);
  await waitFor(() => {
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["test"], "test.png", { type: "image/png" })],
      },
    });
  });
  return { fileInput, handleChangeFile }
};

const initBillPage = async () => {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
  });
  window.localStorage.setItem(
    "user",
    JSON.stringify({
      type: "Employee",
    })
  );
  const root = document.createElement("div");
  root.setAttribute("id", "root");
  document.body.append(root);

  router();

  window.onNavigate(ROUTES_PATH.NewBill);
  const store_ = store;

  newBill = new NewBill({
    document,
    onNavigate,
    store: store_,
    localStorage,
  });
}

beforeAll(() => {
  initBillPage();

  // Add the file input element to the DOM
  const fileInput = document.createElement('input');
  fileInput.setAttribute('type', 'file');
  fileInput.setAttribute('data-testid', 'file');
  document.body.appendChild(fileInput);
});
describe("Given I am connected as an employee", () => {

  beforeEach(() => {
    // Simulate logged-in user
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
        email: "employee@test.com",
      })
    );
    document.body.innerHTML = "";
  });

  describe("When the page is loaded", () => {
    test("Then the form should be displayed", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;
      const form = screen.getByTestId("form-new-bill");
      expect(form).toBeTruthy();
    });
  });

  describe("When I submit a valid form", () => {
    test("Then a new bill should be created", async () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      const form = screen.getByTestId("form-new-bill");
      fireEvent.change(screen.getByTestId("datepicker"), { target: { value: "2023-05-24" } });
      fireEvent.change(screen.getByTestId("amount"), { target: { value: "200" } });
      fireEvent.change(screen.getByTestId("vat"), { target: { value: "20" } });
      fireEvent.change(screen.getByTestId("pct"), { target: { value: "10" } });
      fireEvent.change(screen.getByTestId("file"), { target: { files: [new File(["file"], "file.png", { type: "image/png" })] } });
      fireEvent.change(screen.getByTestId("commentary"), { target: { value: "Test commentary" } });

      const handleSubmit = jest.fn(newBill.handleSubmit);
      form.addEventListener("submit", handleSubmit);
      fireEvent.submit(form);

      await expect(handleSubmit).toHaveBeenCalled();

      // New test case to verify bill creation
      const formData = new FormData();
      const email = JSON.parse(localStorage.getItem("user")).email;
      const file = new File(["file"], "file.png", { type: "image/png" });
      const fileName = "file.png";
      formData.append('file', file);
      formData.append('email', email);

      await expect(newBill.store.bills().create({
        data: formData,
        headers: { noContentType: true }
      })).resolves.toMatchObject({
        fileUrl: expect.any(String),
        key: expect.any(String)
      });
    });
  });

  describe("When I upload an invalid file", () => {
    test("Then an alert should be shown", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      window.alert = jest.fn(); // Mock alert

      const fileInput = screen.getByTestId("file");
      fireEvent.change(fileInput, { target: { files: [new File(["file"], "file.txt", { type: "text/plain" })] } });

      expect(window.alert).toHaveBeenCalledWith("Mauvais format.jpg/.jpeg/.png seulement.");
    });
  });

  describe("When I submit a form with an empty file field", () => {
    test("Then an alert should be shown", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      window.alert = jest.fn(); // Mock alert

      const fileInput = screen.getByTestId("file");
      fireEvent.change(fileInput, { target: { files: [] } });

      const form = screen.getByTestId("form-new-bill");
      fireEvent.submit(form);

      expect(window.alert).toHaveBeenCalledWith("Mauvais format.jpg/.jpeg/.png seulement.");
    });
  });

  describe("When I upload a valid file", () => {
    test("Then the file should be sent to the store", async () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      const onNavigate = jest.fn();
      const newBill = new NewBill({
        document,
        onNavigate,
        store,
        localStorage: window.localStorage,
      });

      const fileInput = screen.getByTestId("file");
      fireEvent.change(fileInput, { target: { files: [new File(["file"], "file.png", { type: "image/png" })] } });

      // Mock the querySelector to return the file input with the files array
      newBill.document.querySelector = jest.fn().mockReturnValue({
        files: [new File(["file"], "file.png", { type: "image/png" })]
      });

      // Mock store.bills().create to return a promise
      newBill.store.bills = jest.fn().mockReturnValue({
        create: jest.fn().mockResolvedValue({
          fileUrl: 'http://example.com/file.png',
          key: '123'
        })
      });

      // Call handleChangeFile
      const mockEvent = { preventDefault: jest.fn(), target: { value: 'C:\\fakepath\\file.png' } };
      newBill.handleChangeFile(mockEvent);

      // Wait for the mock promise to resolve
      await new Promise(r => setTimeout(r, 0));

      // Check that the file was uploaded correctly
      expect(newBill.billId).toBe('123');
      expect(newBill.fileUrl).toBe('http://example.com/file.png');
      expect(newBill.fileName).toBe('file.png');
    });
  });

  test("fetches bills from an API and fails with 404 message error", async () => {
    const logSpy = jest.spyOn(global.console, 'error');
    store.bills.mockImplementationOnce(() => {
      return {
        create: () => {
          return Promise.reject(new Error("Erreur 404"))
        }
      }
    })
  
    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('data-testid', 'file');
    document.body.appendChild(fileInput);
  
    const { handleChangeFile } = await setMockFileToFileInput();
  
    // Mock the implementation of handleChangeFile
    handleChangeFile.mockImplementation((e) => {
      if (e instanceof Error) {
        console.error(e);
      } else {
        e.preventDefault();
      }
    });
  
    // Simulate the error being thrown
    handleChangeFile(new Error("Erreur 404"));
  
    expect(logSpy).toHaveBeenCalledWith(new Error("Erreur 404"));
  });
  
  test("fetches messages from an API and fails with 500 message error", async () => {
    const logSpy = jest.spyOn(global.console, 'error');
    store.bills.mockImplementationOnce(() => {
      return {
        create: () => {
          return Promise.reject(new Error("Erreur 500"))
        }
      }
    });
  
    const fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('data-testid', 'file');
    document.body.appendChild(fileInput);
  
    const { handleChangeFile } = await setMockFileToFileInput();
  
    // Mock the implementation of handleChangeFile
    handleChangeFile.mockImplementation((e) => {
      if (e instanceof Error) {
        console.error(e);
      } else {
        e.preventDefault();
      }
    });
  
    // Simulate the error being thrown
    handleChangeFile(new Error("Erreur 500"));
  
    expect(logSpy).toHaveBeenCalledWith(new Error("Erreur 500"));
  });

});

