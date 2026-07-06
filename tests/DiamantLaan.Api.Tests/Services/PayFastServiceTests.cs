using DiamantLaan.Api.Services;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class PayFastServiceTests
{
    [Fact]
    public void CreateSignature_ReturnsExpectedHash()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["cancel_url"] = "https://www.example.com/cancel",
            ["notify_url"] = "https://www.example.com/itn",
            ["name_first"] = "Test User",
            ["name_last"] = "Doe",
            ["email_address"] = "test+user@example.com",
            ["m_payment_id"] = "42",
            ["amount"] = "200.00",
            ["item_name"] = "Order#42"
        };

        var signature = PayFastService.CreateSignature(data, "jt7NOE43FZPn");

        Assert.Equal("a18a81fce9f020f3cc7b901f9b84a5d5", signature);
    }

    [Fact]
    public void CreateSignature_NullData_ThrowsArgumentNullException()
    {
        var ex = Assert.Throws<ArgumentNullException>(
            () => PayFastService.CreateSignature(null!, "jt7NOE43FZPn"));

        Assert.Equal("data", ex.ParamName);
    }

    [Fact]
    public void CreateSignature_EmptyPassphrase_ProducesSignature()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        var signature = PayFastService.CreateSignature(data, "");

        Assert.NotNull(signature);
        Assert.NotEmpty(signature);
        // With empty passphrase no "&passphrase=" is appended to the param string
    }

    [Fact]
    public void CreateSignature_NullPassphrase_ProducesSignature()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        var signature = PayFastService.CreateSignature(data, null!);

        Assert.NotNull(signature);
        Assert.NotEmpty(signature);
    }

    [Fact]
    public void UrlEncode_SpecialCharacters_EncodedLikePhpUrlencode()
    {
        // PHP urlencode encodes space as +, and percent-encodes ~, *, #, @, and +
        Assert.Equal("hello%2Bworld", PayFastService.UrlEncode("hello+world"));
        Assert.Equal("hello+world", PayFastService.UrlEncode("hello world"));
        Assert.Equal("%7Ehello%7E", PayFastService.UrlEncode("~hello~"));
        Assert.Equal("%2Ahello%2A", PayFastService.UrlEncode("*hello*"));
        Assert.Equal("%23hello%23", PayFastService.UrlEncode("#hello#"));
        Assert.Equal("%40hello%40", PayFastService.UrlEncode("@hello@"));
    }

    [Fact]
    public void CreateSignature_IgnoresFieldsNotInCanonicalOrder()
    {
        // Fields not in the PayFast canonical order list should be ignored
        var dataWithExtra = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test",
            ["unknown_field"] = "should-be-ignored",
            ["another_extra"] = "also-ignored"
        };

        var dataWithoutExtra = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        var sigWithExtra = PayFastService.CreateSignature(dataWithExtra, "secret");
        var sigWithoutExtra = PayFastService.CreateSignature(dataWithoutExtra, "secret");

        Assert.Equal(sigWithoutExtra, sigWithExtra);
    }

    [Fact]
    public void InstanceCreateSignature_DelegatesToStaticMethod()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        var passphrase = "test-passphrase";
        var service = new PayFastService(passphrase);
        var instanceSig = service.CreateSignature(data);
        var staticSig = PayFastService.CreateSignature(data, passphrase);

        Assert.Equal(staticSig, instanceSig);
    }
}
